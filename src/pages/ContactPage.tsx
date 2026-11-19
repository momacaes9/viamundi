import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useDocumentTitle, useLang, useT } from "../lib/i18n";
import { ADVISORS, readUtm, submitLead, validateLead, type AdvisorKey, type LeadForm, type Region } from "../lib/whatsapp";

const PROGRAMS = [
  { pt: "Mentoria completa de admissões", en: "Full admissions mentoring" },
  { pt: "Redação de essays", en: "Essay coaching" },
  { pt: "Preparação para o SAT", en: "SAT preparation" },
  { pt: "Seleção de universidades", en: "University selection" },
  { pt: "Ainda não sei", en: "Not sure yet" },
];

export function ContactPage() {
  const t = useT();
  const { lang } = useLang();
  useDocumentTitle(t({ pt: "Fale conosco no WhatsApp", en: "Chat with us on WhatsApp" }));
  const startedAt = useRef(Date.now());
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    programInterest: "",
    message: "",
    region: "" as Region | "",
    advisor: "" as AdvisorKey | "",
    submitterRole: "" as "student" | "guardian" | "",
    consent: false,
    website: "", // honeypot: humans never see or fill this
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ url: string; advisor: AdvisorKey } | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.website || Date.now() - startedAt.current < 2500) return; // silent drop for bots
    if (!form.submitterRole) return setError(t({ pt: "Diga quem está preenchendo o formulário.", en: "Tell us who is filling in the form." }));
    const lead: LeadForm = {
      fullName: form.fullName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      programInterest: form.programInterest || undefined,
      message: form.message || undefined,
      region: form.region || null,
      advisor: form.advisor || undefined,
      locale: lang,
      submitterRole: form.submitterRole,
      consent: form.consent,
    };
    const problem = validateLead(lead);
    if (problem) return setError(problem);
    setBusy(true);
    const result = await submitLead(supabase, lead, readUtm(window.location.search));
    setBusy(false);
    setDone({ url: result.url, advisor: result.advisor });
  }

  if (done) {
    const a = ADVISORS[done.advisor];
    return (
      <section className="page narrow-page fade-in">
        <div className="card center">
          <div className="success-icon" aria-hidden="true">✓</div>
          <h1 className="h-serif">{t({ pt: "Tudo certo!", en: "All set!" })}</h1>
          <p className="lead">
            {t({ pt: `Sua conversa com ${a.name} está pronta no WhatsApp.`, en: `Your chat with ${a.name} is ready on WhatsApp.` })}
          </p>
          <a className="btn btn-wa" href={done.url} target="_blank" rel="noopener noreferrer">
            {t({ pt: "Abrir WhatsApp", en: "Open WhatsApp" })}
          </a>
          <p className="muted small">{t({ pt: "A mensagem já vai estar escrita. É só tocar em enviar.", en: "Your message will be pre-written. Just tap send." })}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page contact-page">
      <div className="contact-intro">
        <p className="eyebrow">{t({ pt: "Conversa estratégica", en: "Strategy chat" })}</p>
        <h1 className="h-serif xl">
          {t({ pt: "Fale com a gente", en: "Talk to us" })} <em>{t({ pt: "no WhatsApp", en: "on WhatsApp" })}</em>
        </h1>
        <p className="lead">
          {t({
            pt: "Conte um pouco sobre você. Direcionamos sua mensagem para a mentora certa e abrimos a conversa já preenchida.",
            en: "Tell us a little about you. We route your message to the right mentor and open the chat pre-filled.",
          })}
        </p>
        <div className="advisor-cards">
          {(Object.keys(ADVISORS) as AdvisorKey[]).map((k) => (
            <button
              type="button"
              key={k}
              className={`advisor-card${form.advisor === k ? " selected" : ""}`}
              aria-pressed={form.advisor === k}
              onClick={() => set("advisor", form.advisor === k ? "" : k)}
            >
              <span className="advisor-avatar" aria-hidden="true">{ADVISORS[k].name[0]}</span>
              <span>
                <strong>{ADVISORS[k].name}</strong>
                <small>{ADVISORS[k].label[lang].split("·")[1]?.trim()}</small>
              </span>
            </button>
          ))}
        </div>
        <p className="muted small">{t({ pt: "Opcional: escolha uma mentora. Se não escolher, direcionamos pela sua região.", en: "Optional: pick a mentor. Otherwise we route by your region." })}</p>
      </div>

      <form className="card form-card" onSubmit={onSubmit} noValidate>
        <fieldset className="field">
          <legend>{t({ pt: "Quem está preenchendo?", en: "Who is filling this in?" })} *</legend>
          <div className="seg">
            <label className={form.submitterRole === "student" ? "on" : ""}>
              <input type="radio" name="role" checked={form.submitterRole === "student"} onChange={() => set("submitterRole", "student")} />
              {t({ pt: "Estudante (13+ anos)", en: "Student (13+)" })}
            </label>
            <label className={form.submitterRole === "guardian" ? "on" : ""}>
              <input type="radio" name="role" checked={form.submitterRole === "guardian"} onChange={() => set("submitterRole", "guardian")} />
              {t({ pt: "Pai, mãe ou responsável", en: "Parent or guardian" })}
            </label>
          </div>
          <small className="muted">
            {t({
              pt: "Menores de 13 anos: peça para um responsável preencher.",
              en: "Under 13? Please ask a parent or guardian to fill this in.",
            })}
          </small>
        </fieldset>

        <label className="field">
          <span>{t({ pt: "Nome completo", en: "Full name" })} *</span>
          <input autoComplete="name" required maxLength={120} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>E-mail</span>
            <input type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(e) => set("email", e.target.value)} />
          </label>
          <label className="field">
            <span>{t({ pt: "WhatsApp / telefone", en: "WhatsApp / phone" })}</span>
            <input type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+55 …" />
          </label>
        </div>
        <div className="grid-2">
          <label className="field">
            <span>{t({ pt: "Interesse", en: "Interested in" })}</span>
            <select value={form.programInterest} onChange={(e) => set("programInterest", e.target.value)}>
              <option value="">{t({ pt: "Selecione…", en: "Select…" })}</option>
              {PROGRAMS.map((p) => (
                <option key={p.pt} value={p[lang]}>
                  {p[lang]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t({ pt: "Onde você mora?", en: "Where do you live?" })}</span>
            <select value={form.region} onChange={(e) => set("region", e.target.value as Region | "")}>
              <option value="">{t({ pt: "Prefiro não dizer", en: "Prefer not to say" })}</option>
              <option value="BR">{t({ pt: "Brasil", en: "Brazil" })}</option>
              <option value="US">{t({ pt: "Estados Unidos", en: "United States" })}</option>
              <option value="INTL">{t({ pt: "Outro país", en: "Another country" })}</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>{t({ pt: "Mensagem", en: "Message" })}</span>
          <textarea rows={4} maxLength={2000} value={form.message} onChange={(e) => set("message", e.target.value)} />
        </label>
        <label className="hp" aria-hidden="true">
          Website
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} />
          <span>
            {t({ pt: "Li e aceito a ", en: "I have read and accept the " })}
            <Link to="/privacidade" target="_blank">
              {t({ pt: "Política de Privacidade", en: "Privacy Policy" })}
            </Link>
            {t({
              pt: ". Se sou menor de 18 anos, meu responsável está ciente deste contato.",
              en: ". If I am under 18, my parent or guardian knows about this contact.",
            })}
          </span>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-wa btn-block" disabled={busy}>
          {busy ? t({ pt: "Enviando…", en: "Sending…" }) : t({ pt: "Continuar no WhatsApp", en: "Continue on WhatsApp" })}
        </button>
        <p className="muted small center">
          {t({ pt: "Você será levado ao WhatsApp com a mensagem pronta. Nada é enviado sem você tocar em enviar.", en: "You'll be taken to WhatsApp with the message ready. Nothing is sent until you tap send." })}
        </p>
      </form>
    </section>
  );
}
