import { Link } from "react-router-dom";
import { useDocumentTitle, useT } from "../lib/i18n";

export function NotFound() {
  const t = useT();
  useDocumentTitle(t({ pt: "Página não encontrada", en: "Page not found" }));
  return (
    <section className="page narrow-page center fade-in">
      <p className="eyebrow">404</p>
      <h1 className="h-serif xl">{t({ pt: "Este caminho não existe.", en: "This path doesn't exist." })}</h1>
      <p className="lead">{t({ pt: "Mas o seu ainda está por vir.", en: "But yours is still ahead." })}</p>
      <a className="btn btn-gold" href="/">
        {t({ pt: "Voltar ao início", en: "Back to home" })}
      </a>
    </section>
  );
}

export function ComingSoon() {
  const t = useT();
  useDocumentTitle(t({ pt: "Oportunidades", en: "Opportunities" }));
  return (
    <section className="page narrow-page center fade-in">
      <p className="eyebrow">{t({ pt: "Oportunidades", en: "Opportunities" })}</p>
      <h1 className="h-serif xl">{t({ pt: "Webinars e eventos em breve.", en: "Webinars and events coming soon." })}</h1>
      <p className="lead">{t({ pt: "Quer ser avisado? Fale com a gente.", en: "Want to be notified? Get in touch." })}</p>
      <Link className="btn btn-wa" to="/contato">
        WhatsApp
      </Link>
    </section>
  );
}
