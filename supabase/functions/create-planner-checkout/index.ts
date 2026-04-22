import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

const TIER_LOOKUP_KEYS: Record<string, { lookupKey: string; slotLimit: number }> = {
  solo: { lookupKey: "planner_solo_yearly", slotLimit: 1 },
  studio: { lookupKey: "planner_studio_yearly", slotLimit: 5 },
  agency: { lookupKey: "planner_agency_yearly", slotLimit: 15 },
  enterprise: { lookupKey: "planner_enterprise_yearly", slotLimit: 9999 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const body = await req.json().catch(() => ({}));
    const tier = String(body.tier || "").toLowerCase();
    const environment = (body.environment || "sandbox") as StripeEnv;
    const tierConfig = TIER_LOOKUP_KEYS[tier];
    if (!tierConfig) throw new Error(`Invalid tier: ${tier}`);

    const stripe = createStripeClient(environment);

    const prices = await stripe.prices.list({ lookup_keys: [tierConfig.lookupKey] });
    if (!prices.data.length) throw new Error(`Price not found: ${tierConfig.lookupKey}`);
    const stripePriceId = prices.data[0].id;

    const origin = req.headers.get("origin") || "https://matrimonostress.lovable.app";

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded",
      allow_promotion_codes: true,
      customer_email: user.email,
      client_reference_id: user.id,
      return_url: `${origin}/app/upgrade/planner?success=true&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: user.id,
        type: "planner_subscription",
        tier,
        slotLimit: String(tierConfig.slotLimit),
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          type: "planner_subscription",
          tier,
          slotLimit: String(tierConfig.slotLimit),
        },
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-PLANNER-CHECKOUT] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
