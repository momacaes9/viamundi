// WhatsApp lead routing for /contato (alias /whatsapp).
// Flow: validate form → insert lead (anon, RLS allows insert only) → open wa.me link.
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdvisorKey = "julia" | "monica";
export type Region = "BR" | "US" | "INTL";
export type Locale = "pt" | "en";

export const ADVISORS: Record<AdvisorKey, { name: string; e164: string; label: Record<Locale, string> }> = {
  julia: { name: "Júlia", e164: "+5547991795200", label: { pt: "Júlia · Brasil", en: "Júlia · Brazil" } },
  monica: { name: "Monica", e164: "+19195937405", label: { pt: "Monica · EUA / Internacional", en: "Monica · US / International" } },
};

/** BR → Júlia, US/INTL → Monica, no preference → alternate (random keeps load ~50/50 without reading leads). */
export function routeAdvisor(region: Region | null, rand: () => number = Math.random): AdvisorKey {
  if (region === "BR") return "julia";
  if (region === "US" || region === "INTL") return "monica";
  return rand() < 0.5 ? "julia" : "monica";
}

export type LeadForm = {
  fullName: string;
  programInterest?: string;
  message?: string;
  email?: string;
  phone?: string; // any format; normalized to E.164 or dropped
  region: Region | null;
  advisor?: AdvisorKey; // explicit choice overrides region routing
  locale: Locale;
  submitterRole: "student" | "guardian";
  consent: boolean;
};

/** Bump when the privacy policy text changes; stored with each lead as proof of what was accepted. */
export const CONSENT_VERSION = "2026-11-19";

/** Best-effort E.164 normalization. Returns null when the number can't be made valid. */
export function toE164(raw: string | undefined, region: Region | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (region === "BR" && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  else if (region === "US" && digits.length === 10) digits = `1${digits}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}

export function buildWhatsAppMessage(f: Pick<LeadForm, "fullName" | "programInterest" | "message" | "locale">): string {
  const lines =
    f.locale === "en"
      ? [`Hi! I'm ${f.fullName}.`, f.programInterest && `I'm interested in: ${f.programInterest}.`, f.message]
      : [`Olá! Sou ${f.fullName}.`, f.programInterest && `Tenho interesse em: ${f.programInterest}.`, f.message];
  return lines.filter(Boolean).join("\n").slice(0, 1500);
}

export function whatsAppUrl(advisor: AdvisorKey, text: string): string {
  const digits = ADVISORS[advisor].e164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function validateLead(f: LeadForm): string | null {
  const name = f.fullName.trim();
  if (name.length < 2 || name.length > 120) return f.locale === "en" ? "Please enter your name." : "Informe seu nome.";
  if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim()))
    return f.locale === "en" ? "Invalid email." : "E-mail inválido.";
  if ((f.message ?? "").length > 2000) return f.locale === "en" ? "Message too long." : "Mensagem muito longa.";
  if (!f.consent)
    return f.locale === "en" ? "Please accept the privacy policy to continue." : "Aceite a política de privacidade para continuar.";
  return null;
}

/**
 * Logs the lead, then returns the WhatsApp URL to open. If logging fails we still
 * return the URL — never lose the conversation because the database hiccuped.
 */
export async function submitLead(
  supabase: SupabaseClient,
  f: LeadForm,
  utm: Record<string, string> = {},
): Promise<{ url: string; advisor: AdvisorKey; logged: boolean }> {
  const advisor = f.advisor ?? routeAdvisor(f.region);
  const { error } = await supabase.from("leads").insert({
    full_name: f.fullName.trim(),
    email: f.email?.trim() || null,
    phone_e164: toE164(f.phone, f.region),
    program_interest: f.programInterest?.trim() || null,
    message: f.message?.trim() || null,
    region: f.region,
    routed_to: advisor,
    locale: f.locale,
    utm,
    submitter_role: f.submitterRole,
    consent_version: CONSENT_VERSION,
  }); // no .select(): anon may insert but not read leads
  if (error) console.warn("lead insert failed", error.code);
  return { url: whatsAppUrl(advisor, buildWhatsAppMessage(f)), advisor, logged: !error };
}

/** Pick up utm_* params from the current URL to store with the lead. */
export function readUtm(search: string): Record<string, string> {
  const p = new URLSearchParams(search);
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = p.get(k);
    if (v) out[k] = v.slice(0, 100);
  }
  return out;
}
