import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

const TIERS = {
  starter: { lookup_key: "memories_starter_9", photo_limit: 500, label: "Starter" },
  plus: { lookup_key: "memories_plus_29", photo_limit: 1500, label: "Plus" },
  premium: { lookup_key: "memories_premium_49", photo_limit: 2500, label: "Premium" },
} as const;

type TierKey = keyof typeof TIERS;

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
    const weddingId = body.weddingId;
    const tier = body.tier as TierKey;
    const environment = (body.environment || "sandbox") as StripeEnv;
    if (!weddingId) throw new Error("weddingId is required");
    if (!tier || !TIERS[tier]) throw new Error("Invalid tier. Must be starter, plus, or premium");

    const tierConfig = TIERS[tier];
    const stripe = createStripeClient(environment);

    const prices = await stripe.prices.list({ lookup_keys: [tierConfig.lookup_key] });
    if (!prices.data.length) throw new Error(`Price not found: ${tierConfig.lookup_key}`);
    const stripePriceId = prices.data[0].id;

    const origin = req.headers.get("origin") || "https://matrimonostress.lovable.app";

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: "payment",
      ui_mode: "embedded",
      allow_promotion_codes: true,
      customer_email: user.email,
      client_reference_id: weddingId,
      return_url: `${origin}/app/memories?unlock=success&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        weddingId,
        userId: user.id,
        type: "memories_unlock",
        tier,
        photo_limit: String(tierConfig.photo_limit),
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[UNLOCK-PHOTOS] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
