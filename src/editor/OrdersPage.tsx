import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatMoney } from "../lib/content";
import { useAuth } from "../auth/AuthProvider";

type Order = {
  id: string;
  customer_email: string;
  customer_name: string | null;
  amount_cents: number;
  currency: string;
  method: "stripe" | "venmo_manual";
  status: "pending" | "paid" | "failed" | "refunded" | "canceled";
  venmo_reference: string | null;
  paid_at: string | null;
  created_at: string;
  programs: { name_pt: string } | null;
};

const LABEL: Record<Order["status"], string> = { pending: "Pendente", paid: "Pago", failed: "Falhou", refunded: "Reembolsado", canceled: "Cancelado" };

export function OrdersPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Order[] | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("orders")
      .select("id,customer_email,customer_name,amount_cents,currency,method,status,venmo_reference,paid_at,created_at,programs(name_pt)")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setRows((data as unknown as Order[]) ?? []));
  }, []);

  async function verifyVenmo(o: Order) {
    setErr(null);
    if (ref.trim().length < 3) return setErr("Cole o ID ou a nota da transação do Venmo.");
    const patch = { status: "paid" as const, venmo_reference: ref.trim().slice(0, 120), verified_by: session?.user.email ?? null, paid_at: new Date().toISOString() };
    // RLS only lets editors update manual Venmo orders; Stripe orders are changed only by the webhook.
    const { error } = await supabase.from("orders").update(patch).eq("id", o.id).eq("method", "venmo_manual").eq("status", "pending");
    if (error) return setErr("Não foi possível confirmar.");
    setRows((rs) => rs?.map((r) => (r.id === o.id ? { ...r, ...patch } : r)) ?? null);
    setVerifying(null);
    setRef("");
  }

  return (
    <div className="ed-page">
      <header className="ed-head">
        <div>
          <h1 className="h-serif">Pagamentos</h1>
          <p className="muted">Pagamentos via Stripe são confirmados automaticamente. Venmo manual precisa de verificação aqui.</p>
        </div>
      </header>
      {rows === null ? (
        <div className="spinner" />
      ) : rows.length === 0 ? (
        <p className="empty card">Nenhum pagamento ainda.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Programa</th>
                <th>Valor</th>
                <th>Método</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div>{o.customer_name ?? "—"}</div>
                    <div className="muted small">{o.customer_email}</div>
                  </td>
                  <td>{o.programs?.name_pt ?? "—"}</td>
                  <td className="nowrap">{formatMoney(o.amount_cents, o.currency, "pt")}</td>
                  <td>{o.method === "stripe" ? "Stripe" : "Venmo (manual)"}</td>
                  <td>
                    <span className={`badge badge-order-${o.status}`}>{LABEL[o.status]}</span>
                    {o.method === "venmo_manual" && o.status === "pending" && (
                      verifying === o.id ? (
                        <div className="verify-box">
                          <input placeholder="ID / nota do Venmo" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={120} />
                          <button className="btn btn-primary btn-sm" onClick={() => void verifyVenmo(o)}>
                            Confirmar
                          </button>
                          <button className="link-btn" onClick={() => setVerifying(null)}>
                            Cancelar
                          </button>
                          {err && <p className="form-error small">{err}</p>}
                        </div>
                      ) : (
                        <button className="link-btn" onClick={() => setVerifying(o.id)}>
                          Verificar pagamento
                        </button>
                      )
                    )}
                    {o.venmo_reference && <div className="muted small">Ref: {o.venmo_reference}</div>}
                  </td>
                  <td className="nowrap">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
