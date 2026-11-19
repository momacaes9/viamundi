export type Lang = "pt" | "en";
const KEY = "vm-lang";

/** Per-visitor preference only. Storage can throw (private mode) — never let it break the page. */
export function getLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "pt") return saved;
  } catch {
    /* ignore */
  }
  return "pt"; // Portuguese by default; visitors switch with the PT/EN buttons
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
}
