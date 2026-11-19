import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Markdown → HTML that is safe to inject. Even though only editors write posts,
 * we sanitize anyway: a stolen editor session must not be able to plant scripts
 * that run for every reader (stored XSS).
 */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md ?? "", { async: false, gfm: true, breaks: false }) as string;
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "iframe", "object", "embed"],
    FORBID_ATTR: ["style"],
  });
  // Open external links safely.
  return clean.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer nofollow"');
}

/** "Como escolher Universidades nos EUA!" → "como-escolher-universidades-nos-eua" */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function readingMinutes(md: string): number {
  const words = (md ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function formatDate(iso: string | null, lang: "pt" | "en"): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export function formatMoney(cents: number, currency: string, lang: "pt" | "en"): string {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : "pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
