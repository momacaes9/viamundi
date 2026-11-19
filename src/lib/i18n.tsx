import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getLang, setLang as persist, type Lang } from "./lang";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "pt", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang);
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "pt-BR";
  }, [lang]);
  const setLang = (l: Lang) => {
    persist(l);
    setLangState(l);
  };
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Pick the string for the current language: t({ pt: "Olá", en: "Hi" }). */
export function useT() {
  const { lang } = useLang();
  return (s: { pt: string; en: string }) => s[lang];
}

export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Viamundi` : "Viamundi";
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);
}
