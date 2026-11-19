import { Link } from "react-router-dom";
import { useDocumentTitle, useT } from "../lib/i18n";

// The success page never marks anything as paid — only the verified Stripe webhook does.
export function CheckoutResult({ kind }: { kind: "success" | "cancel" }) {
  const t = useT();
  const ok = kind === "success";
  useDocumentTitle(ok ? t({ pt: "Pagamento recebido", en: "Payment received" }) : t({ pt: "Pagamento cancelado", en: "Payment canceled" }));
  return (
    <section className="page narrow-page fade-in">
      <div className="card center">
        <div className={ok ? "success-icon" : "neutral-icon"} aria-hidden="true">
          {ok ? "✓" : "↺"}
        </div>
        <h1 className="h-serif">{ok ? t({ pt: "Obrigada! Recebemos sua inscrição.", en: "Thank you! We got your enrollment." }) : t({ pt: "Pagamento não concluído", en: "Payment not completed" })}</h1>
        <p className="lead">
          {ok
            ? t({ pt: "Você vai receber o recibo do Stripe por e-mail. Nossa equipe entra em contato em até 1 dia útil.", en: "Stripe will email your receipt. Our team will reach out within 1 business day." })
            : t({ pt: "Nenhuma cobrança foi feita. Você pode tentar de novo quando quiser.", en: "You were not charged. You can try again any time." })}
        </p>
        <div className="btn-row">
          <Link className="btn btn-gold" to={ok ? "/" : "/programas"}>
            {ok ? t({ pt: "Voltar ao início", en: "Back to home" }) : t({ pt: "Ver programas", en: "View programs" })}
          </Link>
          <Link className="btn btn-outline-dark" to="/contato">
            WhatsApp
          </Link>
        </div>
      </div>
    </section>
  );
}
