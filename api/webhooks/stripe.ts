// POST /api/webhooks/stripe — the ONLY place an order becomes `paid`.
// Subscribe the endpoint (Stripe Dashboard → Webhooks) to:
//   checkout.session.completed, checkout.session.async_payment_succeeded,
//   checkout.session.async_payment_failed, checkout.session.expired, charge.refunded
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe, getSupabaseAdmin, json } from "../_lib/server.js";

type OrderUpdate = { status: "paid" | "failed" | "canceled" | "refunded"; [k: string]: unknown };

/** Pure decision logic: which order update (if any) does this event imply? Exported for tests. */
export function orderUpdateFor(event: Stripe.Event): { orderId?: string; paymentIntentId?: string; update: OrderUpdate; expectedAmount?: number } | null {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      // Delayed methods complete with payment_status "unpaid" first; wait for async_payment_succeeded.
      if (s.payment_status !== "paid") return null;
      const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      return {
        orderId: s.metadata?.order_id,
        expectedAmount: s.amount_total ?? undefined,
        update: { status: "paid", paid_at: new Date(event.created * 1000).toISOString(), stripe_payment_intent_id: pi ?? null },
      };
    }
    case "checkout.session.async_payment_failed":
      return { orderId: (event.data.object as Stripe.Checkout.Session).metadata?.order_id, update: { status: "failed" } };
    case "checkout.session.expired":
      return { orderId: (event.data.object as Stripe.Checkout.Session).metadata?.order_id, update: { status: "canceled" } };
    case "charge.refunded": {
      const c = event.data.object as Stripe.Charge;
      if (!c.refunded) return null; // partial refund: leave as paid, visible in Stripe
      const pi = typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id;
      return { paymentIntentId: pi ?? undefined, orderId: c.metadata?.order_id, update: { status: "refunded" } };
    }
    default:
      return null;
  }
}

export async function applyEvent(db: SupabaseClient, event: Stripe.Event): Promise<string> {
  const { data: seen } = await db.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return "duplicate";

  const plan = orderUpdateFor(event);
  if (plan) {
    let q = db.from("orders").update(plan.update);
    if (plan.orderId) q = q.eq("id", plan.orderId);
    else if (plan.paymentIntentId) q = q.eq("stripe_payment_intent_id", plan.paymentIntentId);
    else return "no-order-reference";

    // Never let a late/out-of-order event regress a paid or refunded order.
    if (plan.update.status === "paid") q = q.in("status", ["pending", "failed"]);
    if (plan.update.status === "failed" || plan.update.status === "canceled") q = q.eq("status", "pending");
    if (plan.expectedAmount !== undefined) q = q.eq("amount_cents", plan.expectedAmount);

    const { error } = await q;
    if (error) throw new Error(`order update failed: ${error.message}`); // 500 → Stripe retries
  }

  // Record only after successful processing, so a failed attempt is retried.
  await db.from("stripe_events").upsert({ id: event.id, type: event.type }, { onConflict: "id", ignoreDuplicates: true });
  return plan ? plan.update.status : "ignored";
}

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return json({ error: "Missing signature" }, 400);

  const rawBody = await request.text(); // must be the exact bytes Stripe signed
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return json({ error: "Invalid signature" }, 400);
  }

  try {
    const result = await applyEvent(getSupabaseAdmin(), event);
    return json({ received: true, result });
  } catch (e) {
    console.error("stripe webhook", event.id, e);
    return json({ error: "Processing failed" }, 500);
  }
}
