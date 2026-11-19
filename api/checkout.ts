// POST /api/checkout  { programSlug, email, name?, locale? }  ->  { url }
// The browser chooses WHAT to buy; the price always comes from the `programs` table.
// Payment methods (card, Venmo, …) are controlled in the Stripe Dashboard, so
// Venmo shows up automatically for US/USD buyers once it is enabled there.
import { appUrl, getStripe, getSupabaseAdmin, json } from "./_lib/server.js";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SLUG_RE = /^[a-z0-9-]{1,80}$/;

export type CheckoutInput = { programSlug: string; email: string; name?: string; locale: "pt" | "en" };

export function parseCheckoutInput(body: unknown): CheckoutInput | string {
  if (!body || typeof body !== "object") return "Invalid body";
  const b = body as Record<string, unknown>;
  const programSlug = typeof b.programSlug === "string" ? b.programSlug.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : undefined;
  const locale = b.locale === "en" ? "en" : "pt";
  if (!SLUG_RE.test(programSlug)) return "Invalid program";
  if (!EMAIL_RE.test(email) || email.length > 254) return "Invalid email";
  return { programSlug, email, name: name || undefined, locale };
}

export async function POST(request: Request): Promise<Response> {
  // Only our own pages may start a checkout (blocks other sites from scripting it).
  const origin = request.headers.get("origin");
  if (origin && origin !== appUrl()) return json({ error: "Forbidden" }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Expected JSON" }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > 2_000) return json({ error: "Too large" }, 413);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const input = parseCheckoutInput(raw);
  if (typeof input === "string") return json({ error: input }, 400);

  const db = getSupabaseAdmin();
  const { data: program, error: pErr } = await db
    .from("programs")
    .select("id, slug, name_pt, name_en, price_cents, currency, stripe_price_id")
    .eq("slug", input.programSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (pErr) return json({ error: "Lookup failed" }, 500);
  if (!program) return json({ error: "Program not found" }, 404);

  const { data: order, error: oErr } = await db
    .from("orders")
    .insert({
      program_id: program.id,
      customer_email: input.email,
      customer_name: input.name ?? null,
      amount_cents: program.price_cents,
      currency: program.currency,
      method: "stripe",
      status: "pending",
    })
    .select("id")
    .single();
  if (oErr || !order) return json({ error: "Could not create order" }, 500);

  const base = appUrl();
  const productName = input.locale === "en" ? program.name_en : program.name_pt;
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.email,
      client_reference_id: order.id,
      metadata: { order_id: order.id, program_slug: program.slug },
      payment_intent_data: { metadata: { order_id: order.id } },
      line_items: [
        program.stripe_price_id
          ? { price: program.stripe_price_id, quantity: 1 }
          : {
              quantity: 1,
              price_data: {
                currency: program.currency,
                unit_amount: program.price_cents,
                product_data: { name: productName },
              },
            },
      ],
      locale: input.locale === "en" ? "en" : "pt-BR",
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout/cancel`,
    },
    { idempotencyKey: `checkout-${order.id}` },
  );

  await db.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);
  return json({ url: session.url });
}
