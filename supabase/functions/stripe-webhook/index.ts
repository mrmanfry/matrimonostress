import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    log("Missing STRIPE_WEBHOOK_SECRET");
    return new Response(JSON.stringify({ error: "webhook secret not configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "missing signature" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("Signature verification failed", { msg });
    return new Response(JSON.stringify({ error: `invalid signature: ${msg}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  log("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const weddingId =
          session.metadata?.weddingId || (session.client_reference_id as string | null);

        if (!weddingId) {
          log("No weddingId on session", { sessionId: session.id });
          break;
        }

        // Memories one-time unlock
        if (session.mode === "payment" && session.metadata?.type === "memories_unlock") {
          const photoLimit = parseInt(session.metadata?.photo_limit || "0", 10);
          if (photoLimit > 0) {
            const { data: cam } = await supabaseAdmin
              .from("disposable_cameras")
              .select("unlocked_photo_limit")
              .eq("wedding_id", weddingId)
              .maybeSingle();
            const current = (cam as { unlocked_photo_limit?: number } | null)?.unlocked_photo_limit ?? 150;
            const newLimit = Math.max(current, photoLimit);
            await supabaseAdmin
              .from("disposable_cameras")
              .update({ unlocked_photo_limit: newLimit })
              .eq("wedding_id", weddingId);
            log("Memories unlocked", { weddingId, newLimit });
          }
          break;
        }

        // Subscription checkout
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await supabaseAdmin
            .from("weddings")
            .update({
              subscription_status: sub.status,
              stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
              stripe_subscription_id: sub.id,
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            })
            .eq("id", weddingId);
          log("Subscription activated", { weddingId, subId, status: sub.status });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const weddingId = sub.metadata?.weddingId;
        if (!weddingId) {
          log("No weddingId on subscription metadata", { subId: sub.id });
          break;
        }
        await supabaseAdmin
          .from("weddings")
          .update({
            subscription_status: sub.status,
            stripe_subscription_id: sub.id,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("id", weddingId);
        log("Subscription synced", { weddingId, status: sub.status });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const weddingId = sub.metadata?.weddingId;
        if (!weddingId) break;
        await supabaseAdmin
          .from("weddings")
          .update({
            subscription_status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("id", weddingId);
        log("Invoice paid -> subscription renewed", { weddingId });
        break;
      }

      default:
        log("Unhandled event", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("Handler error", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
