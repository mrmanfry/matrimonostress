import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAdmin.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const body = await req.json().catch(() => ({}));
    const weddingId = body.weddingId;
    if (!weddingId) throw new Error("weddingId is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find completed checkout sessions for this wedding
    const sessions = await stripe.checkout.sessions.list({ limit: 50 });

    // Find all paid sessions for this wedding, get the highest photo_limit
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
      // Get current limit to avoid downgrade
      const { data: cam } = await supabaseAdmin
        .from("disposable_cameras")
        .select("unlocked_photo_limit")
        .eq("wedding_id", weddingId)
        .maybeSingle();

      const currentLimit = (cam as any)?.unlocked_photo_limit || 150;
      const newLimit = Math.max(currentLimit, maxPhotoLimit);

      await supabaseAdmin
        .from("disposable_cameras")
        .update({ unlocked_photo_limit: newLimit })
        .eq("wedding_id", weddingId);

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
