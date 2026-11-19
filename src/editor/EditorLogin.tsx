import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { useDocumentTitle } from "../lib/i18n";

/**
 * Passwordless sign-in. shouldCreateUser:false means this form can never create accounts —
 * only Monica and Julia (invited from the Supabase dashboard) can receive a link/code.
 * The message shown is identical whether or not the email exists (no account enumeration).
 */
export default function EditorLogin() {
  useDocumentTitle("Entrar");
  const { session, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  if (!loading && session) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from.startsWith("/editor") ? from : "/editor"} replace />;
  }

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return setError("Digite um e-mail válido.");
    setBusy(true);
    await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/editor` },
    });
    // Intentionally ignore the result: same response for allowed and unknown emails.
    setBusy(false);
    setStage("code");
    setCooldown(60);
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return setError("O código tem 6 dígitos.");
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
    setBusy(false);
    if (err) setError("Código inválido ou expirado. Peça um novo.");
    // On success, onAuthStateChange updates the session and this page redirects.
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <a href="/" className="login-brand">
          <img src="/img/viamundi-logo.png" alt="" width="56" height="56" />
          <span>
            VIA<b>MUNDI</b>
          </span>
        </a>
        <h1 className="h-serif">Painel editorial</h1>
        {stage === "email" ? (
          <form onSubmit={sendLink} noValidate>
            <p className="muted">Acesso restrito à equipe. Enviaremos um link e um código para o seu e-mail.</p>
            <label className="field">
              <span>E-mail</span>
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Enviando…" : "Enviar link de acesso"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} noValidate>
            <p className="muted">
              Se <strong>{email}</strong> tiver acesso, você vai receber um e-mail em instantes. Clique no link ou digite o código abaixo.
            </p>
            <label className="field">
              <span>Código de 6 dígitos</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="code-input"
                autoFocus
              />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Verificando…" : "Entrar"}
            </button>
            <div className="login-alt">
              <button type="button" className="link-btn" onClick={() => setStage("email")}>
                Usar outro e-mail
              </button>
              <button type="button" className="link-btn" disabled={cooldown > 0} onClick={(e) => void sendLink(e as unknown as FormEvent)}>
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar"}
              </button>
            </div>
          </form>
        )}
      </div>
      <p className="login-foot">
        <a href="/">← Voltar ao site</a>
      </p>
    </div>
  );
}
