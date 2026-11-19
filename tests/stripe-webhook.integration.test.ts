// Integration test: needs a local Supabase (`supabase start`) and these env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (local values from `supabase status`)
// Stripe is NOT called over the network — events are signed locally with a test secret.
import { beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { POST } from "../api/webhooks/stripe";
import { parseCheckoutInput } from "../api/checkout";

const WEBHOOK_SECRET = "whsec_local_test_only";
process.env.STRIPE_SECRET_KEY ??= "sk_test_local_placeholder";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

let programId: string;
async function newOrder(amount = 50000) {
  const { data, error } = await db.from("orders")
    .insert({ program_id: programId, customer_email: "s@test.local", amount_cents: amount, currency: "usd" })
    .select("id").single();
  if (error) throw error;
  return data.id as string;
}
const status = async (id: string) => (await db.from("orders").select("status, paid_at, stripe_payment_intent_id").eq("id", id).single()).data!;

let n = 0;
function signedRequest(type: string, object: Record<string, unknown>, opts: { secret?: string; id?: string } = {}) {
  const payload = JSON.stringify({ id: opts.id ?? `evt_test_${Date.now()}_${n++}`, object: "event", type, created: 1_763_000_000, data: { object } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: opts.secret ?? WEBHOOK_SECRET });
  return new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": header } });
}
const session = (orderId: string, extra: Record<string, unknown> = {}) =>
  ({ object: "checkout.session", metadata: { order_id: orderId }, payment_status: "paid", amount_total: 50000, payment_intent: `pi_${orderId.slice(0, 8)}`, ...extra });

beforeAll(async () => {
  const { data, error } = await db.from("programs")
    .upsert({ slug: "test-program", name_pt: "Teste", name_en: "Test", price_cents: 50000 }, { onConflict: "slug" })
    .select("id").single();
  if (error) throw error;
  programId = data.id;
});

describe("checkout input", () => {
  it("validates", () => {
    expect(parseCheckoutInput({ programSlug: "test-program", email: " A@B.co " })).toEqual({ programSlug: "test-program", email: "a@b.co", name: undefined, locale: "pt" });
    expect(parseCheckoutInput({ programSlug: "DROP TABLE", email: "a@b.co" })).toBe("Invalid program");
    expect(parseCheckoutInput({ programSlug: "x", email: "nope" })).toBe("Invalid email");
    expect(parseCheckoutInput({ programSlug: "x", email: "a@b.co", amount: 1 })).not.toHaveProperty("amount");
  });
});

describe("stripe webhook", () => {
  it("rejects a bad signature", async () => {
    const id = await newOrder();
    const res = await POST(signedRequest("checkout.session.completed", session(id), { secret: "whsec_wrong" }));
    expect(res.status).toBe(400);
    expect((await status(id)).status).toBe("pending");
  });

  it("marks the order paid, records PI, and is idempotent on retry", async () => {
    const id = await newOrder();
    const req = () => signedRequest("checkout.session.completed", session(id), { id: `evt_dup_${id}` });
    const r1 = await POST(req());
    expect(await r1.json()).toMatchObject({ result: "paid" });
    const s = await status(id);
    expect(s.status).toBe("paid");
    expect(s.paid_at).toBeTruthy();
    expect(s.stripe_payment_intent_id).toBe(`pi_${id.slice(0, 8)}`);
    expect(await (await POST(req())).json()).toMatchObject({ result: "duplicate" });
  });

  it("waits for async payments (unpaid completion does not mark paid)", async () => {
    const id = await newOrder();
    await POST(signedRequest("checkout.session.completed", session(id, { payment_status: "unpaid" })));
    expect((await status(id)).status).toBe("pending");
    await POST(signedRequest("checkout.session.async_payment_succeeded", session(id)));
    expect((await status(id)).status).toBe("paid");
  });

  it("refuses to mark paid when the amount does not match the order", async () => {
    const id = await newOrder(50000);
    await POST(signedRequest("checkout.session.completed", session(id, { amount_total: 100 })));
    expect((await status(id)).status).toBe("pending");
  });

  it("does not regress a paid order on a late expired event", async () => {
    const id = await newOrder();
    await POST(signedRequest("checkout.session.completed", session(id)));
    await POST(signedRequest("checkout.session.expired", session(id, { payment_status: "unpaid" })));
    expect((await status(id)).status).toBe("paid");
  });

  it("marks refunded via payment intent on full refund", async () => {
    const id = await newOrder();
    await POST(signedRequest("checkout.session.completed", session(id)));
    await POST(signedRequest("charge.refunded", { object: "charge", refunded: true, metadata: {}, payment_intent: `pi_${id.slice(0, 8)}` }));
    expect((await status(id)).status).toBe("refunded");
  });
});
