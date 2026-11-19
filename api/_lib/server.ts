// Server-only helpers for Vercel Functions. Files under api/_lib are not exposed as routes.
// NEVER import this from src/ — it reads secrets.
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

let stripe: Stripe | undefined;
export function getStripe(): Stripe {
  stripe ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return stripe;
}

let admin: SupabaseClient | undefined;
/** Service-role client: bypasses RLS. Only for checkout + webhook writes. */
export function getSupabaseAdmin(): SupabaseClient {
  admin ??= createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export function appUrl(): string {
  return requireEnv("APP_URL").replace(/\/+$/, "");
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
