import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
  const sessionType = m.type;

  // === Memories one-time unlock ===
  if (session.mode === "payment" && sessionType === "memories_unlock") {
    const weddingId = m.weddingId || str(session.client_reference_id);
    if (!weddingId) {
      log("No weddingId on memories_unlock session");
      return;
    }
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

  // === Planner subscription checkout ===
  if (session.mode === "subscription" && sessionType === "planner_subscription") {
    const userId = m.userId || str(session.client_reference_id);
    if (!userId) {
      log("No userId on planner subscription session");
      return;
    }
    const tier = (m.tier || "solo").toLowerCase();
    const slotLimit = parseInt(m.slotLimit || "1", 10);
    const customerId = str(session.customer);
    const subscriptionId = str(session.subscription);

    await supabase.from("planner_subscriptions").upsert(
      {
        user_id: userId,
        tier,
        slot_limit: slotLimit,
        subscription_status: "active",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    log("Planner subscription bootstrap", { userId, tier });
    return;
  }

  // === Couple subscription (default) ===
  if (session.mode === "subscription") {
    const weddingId = m.weddingId || str(session.client_reference_id);
    if (!weddingId) {
      log("No weddingId on couple subscription session");
      return;
    }
    const customerId = str(session.customer);
    const subscriptionId = str(session.subscription);
    const payerUserId = m.userId;

    if (customerId && subscriptionId) {
      await supabase
        .from("weddings")
        .update({
          subscription_status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq("id", weddingId);
      log("Couple subscription bootstrap", { weddingId });
    }

    // Trigger partner-unlock notification
    if (payerUserId) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/notify-partner-unlock`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ weddingId, payerUserId }),
        });
      } catch (err) {
        log("notify-partner-unlock invocation failed", err);
      }
    }
  }
}

async function handleSubscriptionUpsert(sub: SObj) {
  const m = meta(sub);
  const subType = m.type;
  const periodEnd = num(sub.current_period_end);
  const stripeStatus = str(sub.status) || "active";
  const cancelAtPeriodEnd = sub.cancel_at_period_end === true;

  // Planner subscription update
  if (subType === "planner_subscription" && m.userId) {
    const tier = (m.tier || "solo").toLowerCase();
    const slotLimit = parseInt(m.slotLimit || "1", 10);
    await supabase
      .from("planner_subscriptions")
      .upsert(
        {
          user_id: m.userId,
          tier,
          slot_limit: slotLimit,
          subscription_status: stripeStatus,
          stripe_customer_id: str(sub.customer),
          stripe_subscription_id: str(sub.id),
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    log("Planner subscription synced", { userId: m.userId, status: stripeStatus, cancelAtPeriodEnd });
    return;
  }

  // Couple subscription update (default)
  const weddingId = m.weddingId;
  if (!weddingId) {
    log("No weddingId on couple subscription event", { id: str(sub.id) });
    return;
  }

  await supabase
    .from("weddings")
    .update({
      subscription_status: stripeStatus,
      stripe_customer_id: str(sub.customer),
      stripe_subscription_id: str(sub.id),
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq("id", weddingId);
  log("Couple subscription synced", { weddingId, status: stripeStatus, cancelAtPeriodEnd });
}

async function handleSubscriptionDeleted(sub: SObj) {
  const m = meta(sub);
  const subType = m.type;
  const periodEnd = num(sub.current_period_end);
  const isStillInPeriod = periodEnd ? periodEnd * 1000 > Date.now() : false;
  const newStatus = isStillInPeriod ? "active" : "canceled";

  if (subType === "planner_subscription" && m.userId) {
    await supabase
      .from("planner_subscriptions")
      .update({
        subscription_status: newStatus,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
      .eq("user_id", m.userId);
    log("Planner subscription deleted", { userId: m.userId, isStillInPeriod });
    return;
  }

  const weddingId = m.weddingId;
  if (!weddingId) return;
  await supabase
    .from("weddings")
    .update({
      subscription_status: newStatus,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq("id", weddingId);
  log("Couple subscription deleted", { weddingId, isStillInPeriod });
}

async function handleInvoicePaid(invoice: SObj) {
  const subId = str(invoice.subscription);
  if (!subId) return;
  const lines = (invoice.lines as { data?: Array<{ period?: { end?: number } }> } | undefined)?.data ?? [];
  const periodEnd = lines[0]?.period?.end;
  if (!periodEnd) return;
  const isoEnd = new Date(periodEnd * 1000).toISOString();

  // Try couple
  await supabase
    .from("weddings")
    .update({ subscription_status: "active", current_period_end: isoEnd })
    .eq("stripe_subscription_id", subId);

  // Try planner
  await supabase
    .from("planner_subscriptions")
    .update({ subscription_status: "active", current_period_end: isoEnd })
    .eq("stripe_subscription_id", subId);

  log("Invoice paid -> renewed", { subId });
}
