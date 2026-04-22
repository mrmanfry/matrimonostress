import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

/**
 * Fallback verifier for Memories one-time unlocks.
 * Called by the client when redirected back from Embedded Checkout, in case
 * the payments-webhook event hasn't landed yet. Idempotent — safe to call
 * multiple times. Uses Stripe via the Lovable connector gateway.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAdmin.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const body = await req.json().catch(() => ({}));
    const weddingId = body.weddingId;
    const environment = (body.environment || "sandbox") as StripeEnv;
    if (!weddingId) throw new Error("weddingId is required");

    const stripe = createStripeClient(environment);

    // Look at recent paid sessions for this wedding (filter client-side by metadata)
    const sessions = await stripe.checkout.sessions.list({ limit: 50 });

    let maxPhotoLimit = 0;
    for (const s of sessions.data) {
      if (
        s.payment_status === "paid" &&
        s.metadata?.weddingId === weddingId &&
        s.metadata?.type === "memories_unlock"
      ) {
        const limit = parseInt(s.metadata?.photo_limit || "0", 10);
        if (limit > maxPhotoLimit) maxPhotoLimit = limit;
      }
    }

    if (maxPhotoLimit > 0) {
      const { data: cam } = await supabaseAdmin
        .from("disposable_cameras")
        .select("unlocked_photo_limit")
        .eq("wedding_id", weddingId)
        .maybeSingle();

      const currentLimit =
        (cam as { unlocked_photo_limit?: number } | null)?.unlocked_photo_limit ?? 150;
      const newLimit = Math.max(currentLimit, maxPhotoLimit);

      if (newLimit > currentLimit) {
        await supabaseAdmin
          .from("disposable_cameras")
          .update({ unlocked_photo_limit: newLimit })
          .eq("wedding_id", weddingId);
      }

      return new Response(JSON.stringify({ unlocked: true, photo_limit: newLimit }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ unlocked: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[VERIFY-UNLOCK] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
