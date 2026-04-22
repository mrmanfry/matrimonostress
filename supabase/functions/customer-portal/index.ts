import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const body = await req.json().catch(() => ({}));
    const environment = (body.environment || "sandbox") as StripeEnv;
    const weddingId = body.weddingId;

    const stripe = createStripeClient(environment);

    // Find customer by stored ID first, fallback to email lookup
    let customerId: string | undefined;
    if (weddingId) {
      const { data: w } = await supabaseAdmin
        .from("weddings")
        .select("stripe_customer_id")
        .eq("id", weddingId)
        .maybeSingle();
      customerId = (w as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? undefined;
    }
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) throw new Error("No customer found");
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://matrimonostress.lovable.app";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/app/settings`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CUSTOMER-PORTAL] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
