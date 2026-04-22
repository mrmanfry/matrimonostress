import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const log = (s: string, d?: unknown) => console.log(`[PAYMENTS-WEBHOOK] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    log("Event received", { type: event.type, env });

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      default:
        log("Unhandled", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("Webhook error", { msg });
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }
});

type SObj = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const meta = (o: SObj): Record<string, string> => (o.metadata as Record<string, string>) || {};

async function handleCheckoutCompleted(session: SObj) {
  const m = meta(session);
  const weddingId = m.weddingId || str(session.client_reference_id);
  if (!weddingId) {
    log("No weddingId on session", { id: str(session.id) });
    return;
  }

  // One-time memories unlock
  if (session.mode === "payment" && m.type === "memories_unlock") {
    const photoLimit = parseInt(m.photo_limit || "0", 10);
    if (photoLimit > 0) {
      const { data: cam } = await supabase
        .from("disposable_cameras")
        .select("unlocked_photo_limit")
        .eq("wedding_id", weddingId)
        .maybeSingle();
      const current = (cam as { unlocked_photo_limit?: number } | null)?.unlocked_photo_limit ?? 150;
      const newLimit = Math.max(current, photoLimit);
      await supabase
        .from("disposable_cameras")
        .update({ unlocked_photo_limit: newLimit })
        .eq("wedding_id", weddingId);
      log("Memories unlocked", { weddingId, newLimit });
    }
    return;
  }

  // Subscription checkout: subscription.created event will populate the rest
  if (session.mode === "subscription") {
    const customerId = str(session.customer);
    const subscriptionId = str(session.subscription);
    if (customerId && subscriptionId) {
      await supabase
        .from("weddings")
        .update({
          subscription_status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq("id", weddingId);
      log("Subscription bootstrap on checkout", { weddingId });
    }
  }
}

async function handleSubscriptionUpsert(sub: SObj) {
  const m = meta(sub);
  const weddingId = m.weddingId;
  if (!weddingId) {
    log("No weddingId on subscription", { id: str(sub.id) });
    return;
  }
  const periodEnd = num(sub.current_period_end);
  const stripeStatus = str(sub.status) || "active";
  const cancelAtPeriodEnd = sub.cancel_at_period_end === true;

  // If user clicked cancel: keep `active` until current_period_end (grace period).
  // Stripe still reports status="active" with cancel_at_period_end=true until the period ends,
  // then fires customer.subscription.deleted, which we handle below.
  const effectiveStatus = stripeStatus;

  await supabase
    .from("weddings")
    .update({
      subscription_status: effectiveStatus,
      stripe_customer_id: str(sub.customer),
      stripe_subscription_id: str(sub.id),
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq("id", weddingId);
  log("Subscription synced", { weddingId, status: effectiveStatus, cancelAtPeriodEnd });
}

async function handleSubscriptionDeleted(sub: SObj) {
  const m = meta(sub);
  const weddingId = m.weddingId;
  if (!weddingId) return;
  // Honor remaining paid period: only flip to canceled if current_period_end has passed.
  const periodEnd = num(sub.current_period_end);
  const isStillInPeriod = periodEnd ? periodEnd * 1000 > Date.now() : false;
  await supabase
    .from("weddings")
    .update({
      subscription_status: isStillInPeriod ? "active" : "canceled",
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq("id", weddingId);
  log("Subscription deleted", { weddingId, isStillInPeriod });
}

async function handleInvoicePaid(invoice: SObj) {
  const subId = str(invoice.subscription);
  if (!subId) return;
  // We don't have the full subscription here; rely on subscription.updated event
  // but proactively bump period_end if invoice contains period info
  const lines = (invoice.lines as { data?: Array<{ period?: { end?: number } }> } | undefined)?.data ?? [];
  const periodEnd = lines[0]?.period?.end;
  if (periodEnd) {
    await supabase
      .from("weddings")
      .update({
        subscription_status: "active",
        current_period_end: new Date(periodEnd * 1000).toISOString(),
      })
      .eq("stripe_subscription_id", subId);
    log("Invoice paid -> renewed", { subId });
  }
}
