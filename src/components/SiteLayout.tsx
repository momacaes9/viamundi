import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useLang, useT } from "../lib/i18n";

const CALENDAR = "https://calendar.app.google/noVFMsnWXnxQdywp9";

export function SiteLayout({ children }: { children: ReactNode }) {
  const { lang, setLang } = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const links = [
    { href: "/#team", label: t({ pt: "A Equipe", en: "The Team" }), external: true },
    { href: "/#services", label: t({ pt: "Serviços", en: "Services" }), external: true },
    { href: "/programas", label: t({ pt: "Programas", en: "Programs" }) },
    { href: "/blog", label: "Blog" },
    { href: "/contato", label: t({ pt: "Contato", en: "Contact" }) },
  ];

  return (
    <div className="site">
      <a href="#main" className="skip-link">
        {t({ pt: "Pular para o conteúdo", en: "Skip to content" })}
      </a>
      <div className="lang-strip">
        {(["pt", "en"] as const).map((l) => (
          <button key={l} className={`lang-chip${lang === l ? " active" : ""}`} aria-pressed={lang === l} onClick={() => setLang(l)}>
            {l === "pt" ? "🇧🇷 PT" : "🇺🇸 EN"}
          </button>
        ))}
      </div>
      <header className="site-nav">
        <a href="/" className="brand" aria-label="Viamundi">
          <img src="/img/viamundi-logo.png" alt="" width="44" height="44" />
          <span>
            VIA<b>MUNDI</b>
          </span>
        </a>
        <button className={`burger${open ? " open" : ""}`} aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span />
        </button>
        <nav className={`nav-items${open ? " open" : ""}`} aria-label={t({ pt: "Principal", en: "Main" })}>
          {links.map((l) =>
            l.external ? (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ) : (
              <NavLink key={l.href} to={l.href}>
                {l.label}
              </NavLink>
            ),
          )}
          <a className="btn btn-gold btn-sm" href={CALENDAR} target="_blank" rel="noopener noreferrer">
            {t({ pt: "Agendar Conversa", en: "Book a Call" })}
          </a>
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="site-foot">
        <div className="foot-grid">
          <div>
            <p className="foot-logo">
              VIA<b>MUNDI</b>
            </p>
            <p className="muted-light">{t({ pt: "O Caminho para o Extraordinário", en: "The Path to the Extraordinary" })}</p>
          </div>
          <div>
            <h5>{t({ pt: "Navegar", en: "Explore" })}</h5>
            <a href="/">{t({ pt: "Início", en: "Home" })}</a>
            <Link to="/blog">Blog</Link>
            <Link to="/programas">{t({ pt: "Programas", en: "Programs" })}</Link>
          </div>
          <div>
            <h5>{t({ pt: "Contato", en: "Contact" })}</h5>
            <Link to="/contato">WhatsApp</Link>
            <a href="https://www.instagram.com/viamundieducation/" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href="https://www.youtube.com/@viamundieducation" target="_blank" rel="noopener noreferrer">
              YouTube
            </a>
          </div>
          <div>
            <h5>Legal</h5>
            <Link to="/privacidade">{t({ pt: "Política de Privacidade", en: "Privacy Policy" })}</Link>
          </div>
        </div>
        <p className="foot-copy">© {new Date().getFullYear()} Viamundi. {t({ pt: "Todos os direitos reservados.", en: "All rights reserved." })}</p>
      </footer>
    </div>
  );
}
