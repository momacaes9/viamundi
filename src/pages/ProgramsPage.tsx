import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatMoney } from "../lib/content";
import { startCheckout } from "../lib/payments";
import { useDocumentTitle, useLang, useT } from "../lib/i18n";

type Program = {
  slug: string;
  name_pt: string;
  name_en: string;
  description_pt: string | null;
  description_en: string | null;
  price_cents: number;
  currency: string;
};

export function ProgramsPage() {
  const t = useT();
  const { lang } = useLang();
  useDocumentTitle(t({ pt: "Programas", en: "Programs" }));
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [selected, setSelected] = useState<Program | null>(null);

  useEffect(() => {
    supabase
      .from("programs")
      .select("slug,name_pt,name_en,description_pt,description_en,price_cents,currency")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setPrograms((data as Program[]) ?? []));
  }, []);

  return (
    <section className="page">
      <header className="page-head">
        <p className="eyebrow">{t({ pt: "Programas", en: "Programs" })}</p>
        <h1 className="h-serif xl">
          {t({ pt: "Escolha o seu ", en: "Choose your " })}
          <em>{t({ pt: "programa", en: "program" })}</em>
        </h1>
        <p className="lead">{t({ pt: "Pagamento seguro via Stripe: cartão e, nos EUA, Venmo.", en: "Secure payment via Stripe: card and, in the US, Venmo." })}</p>
      </header>

      {programs === null ? (
        <div className="program-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="program-card skeleton" />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="card center narrow">
          <p className="lead">{t({ pt: "As inscrições abrem em breve.", en: "Enrollment opens soon." })}</p>
          <Link className="btn btn-wa" to="/contato">
            {t({ pt: "Fale com a gente no WhatsApp", en: "Chat with us on WhatsApp" })}
          </Link>
        </div>
      ) : (
        <div className="program-grid">
          {programs.map((p) => (
            <article key={p.slug} className="program-card">
              <h2 className="h-serif">{lang === "en" ? p.name_en : p.name_pt}</h2>
              <p className="price">{formatMoney(p.price_cents, p.currency, lang)}</p>
              <p className="muted">{lang === "en" ? p.description_en : p.description_pt}</p>
              <button className="btn btn-gold btn-block" onClick={() => setSelected(p)}>
                {t({ pt: "Inscrever-se", en: "Enroll" })}
              </button>
            </article>
          ))}
        </div>
      )}
      {selected && <CheckoutDialog program={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function CheckoutDialog({ program, onClose }: { program: Program; onClose: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function go(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError(t({ pt: "E-mail inválido.", en: "Invalid email." }));
    setBusy(true);
    try {
      await startCheckout({ programSlug: program.slug, email: email.trim(), name: name.trim() || undefined, locale: lang });
    } catch {
      setBusy(false);
      setError(t({ pt: "Não foi possível iniciar o pagamento. Tente novamente.", en: "Couldn't start checkout. Please try again." }));
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card" role="dialog" aria-modal="true" aria-labelledby="co-title">
        <button className="modal-x" onClick={onClose} aria-label={t({ pt: "Fechar", en: "Close" })}>
          ×
        </button>
        <h2 id="co-title" className="h-serif">
          {lang === "en" ? program.name_en : program.name_pt}
        </h2>
        <p className="price">{formatMoney(program.price_cents, program.currency, lang)}</p>
        <form onSubmit={go} noValidate>
          <label className="field">
            <span>{t({ pt: "Nome do estudante ou responsável", en: "Student or guardian name" })}</span>
            <input autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>E-mail *</span>
            <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-gold btn-block" disabled={busy}>
            {busy ? t({ pt: "Redirecionando…", en: "Redirecting…" }) : t({ pt: "Ir para o pagamento seguro", en: "Continue to secure payment" })}
          </button>
          <p className="muted small center">
            {t({ pt: "Você será levado ao Stripe. Não armazenamos dados de cartão.", en: "You'll be taken to Stripe. We never store card details." })}
          </p>
        </form>
      </div>
    </div>
  );
}
