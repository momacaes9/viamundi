// Landing page behaviour: language toggle, mobile nav, scroll reveals.
// No inline handlers anywhere, so the Content-Security-Policy can forbid inline scripts.
import "../styles/landing.css";
import { getLang, setLang as persistLang, type Lang } from "../lib/lang";

function applyLang(lang: Lang) {
  document.body.classList.toggle("lang-en", lang === "en");
  document.documentElement.lang = lang === "en" ? "en" : "pt-BR";
  for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-set-lang]")) {
    const active = btn.dataset.setLang === lang;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  }
}

applyLang(getLang());
for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-set-lang]")) {
  btn.addEventListener("click", () => {
    const lang = btn.dataset.setLang === "en" ? "en" : "pt";
    persistLang(lang);
    applyLang(lang);
  });
}

// Mobile menu
const toggle = document.getElementById("nav-toggle");
const links = document.getElementById("nav-links");
if (toggle && links) {
  const setOpen = (open: boolean) => {
    toggle.classList.toggle("open", open);
    links.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.addEventListener("click", () => setOpen(!links.classList.contains("open")));
  links.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
}

// Scroll reveal
const reveal = document.querySelectorAll<HTMLElement>(".rv");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("on");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  reveal.forEach((el) => io.observe(el));
} else {
  reveal.forEach((el) => el.classList.add("on"));
}
