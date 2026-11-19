import { createClient } from "@supabase/supabase-js";

// Browser client: publishable key only. Every table is protected by Row-Level Security,
// so this key can only do what the RLS policies allow for the signed-in user (or anon).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url ?? "http://localhost:54321", key ?? "missing-key", {
  auth: {
    flowType: "pkce", // magic links carry a one-time code, not tokens in the URL
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const COVER_BUCKET = "post-covers";
export function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
}
