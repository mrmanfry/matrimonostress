import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

const PREMIUM_LOOKUP_KEY = "premium_yearly_49";

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
    const environment = (body.environment || "sandbox") as StripeEnv;
    if (!weddingId) throw new Error("weddingId is required");

    const stripe = createStripeClient(environment);

    // Resolve human-readable price ID via lookup_keys
    const prices = await stripe.prices.list({ lookup_keys: [PREMIUM_LOOKUP_KEY] });
    if (!prices.data.length) throw new Error(`Price not found: ${PREMIUM_LOOKUP_KEY}`);
    const stripePriceId = prices.data[0].id;

    const origin = req.headers.get("origin") || "https://matrimonostress.lovable.app";

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded",
      allow_promotion_codes: true,
      customer_email: user.email,
      client_reference_id: weddingId,
      return_url: `${origin}/app/upgrade?success=true&session_id={CHECKOUT_SESSION_ID}`,
      metadata: { weddingId, userId: user.id },
      subscription_data: {
        metadata: { weddingId, userId: user.id },
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-CHECKOUT] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
