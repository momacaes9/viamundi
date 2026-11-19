// Browser-side payment helpers. No secrets here: Stripe runs in /api/checkout.

/** Starts Stripe Checkout (card, Venmo, etc. as enabled in the Stripe Dashboard). */
export async function startCheckout(input: { programSlug: string; email: string; name?: string; locale: "pt" | "en" }) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout unavailable");
  window.location.assign(data.url);
}

/**
 * Manual P2P fallback (outside Stripe). An editor verifies the payment in /editor
 * by matching the note. Handle comes from VITE_VENMO_HANDLE (public business handle).
 */
export function venmoPayLink(opts: { handle: string; amountUsd: number; note: string; web?: boolean }): string {
  const params = new URLSearchParams({
    txn: "pay",
    recipients: opts.handle.replace(/^@/, ""),
    amount: opts.amountUsd.toFixed(2),
    note: opts.note.slice(0, 280),
  });
  return opts.web ? `https://venmo.com/?${params}` : `venmo://paycharge?${params}`;
}
