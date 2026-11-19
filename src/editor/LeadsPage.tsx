import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ADVISORS, type AdvisorKey } from "../lib/whatsapp";

type Lead = {
  id: string;
  full_name: string;
  email: string | null;
  phone_e164: string | null;
  program_interest: string | null;
  message: string | null;
  region: string | null;
  routed_to: AdvisorKey;
  submitter_role: "student" | "guardian";
  status: "new" | "contacted" | "qualified" | "enrolled" | "lost";
  notes: string | null;
  created_at: string;
};

const STATUSES: Record<Lead["status"], string> = { new: "Novo", contacted: "Contatado", qualified: "Qualificado", enrolled: "Matriculado", lost: "Perdido" };

export function LeadsPage() {
  const [rows, setRows] = useState<Lead[] | null>(null);
  const [status, setStatus] = useState<"" | Lead["status"]>("");
  const [advisor, setAdvisor] = useState<"" | AdvisorKey>("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let q = supabase
      .from("leads")
      .select("id,full_name,email,phone_e164,program_interest,message,region,routed_to,submitter_role,status,notes,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status) q = q.eq("status", status);
    if (advisor) q = q.eq("routed_to", advisor);
    q.then(({ data }) => setRows((data as Lead[]) ?? []));
  }, [status, advisor]);

  async function update(id: string, patch: Partial<Pick<Lead, "status" | "notes">>) {
    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (!error) setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? null);
  }

  return (
    <div className="ed-page">
      <header className="ed-head">
        <div>
          <h1 className="h-serif">Leads</h1>
          <p className="muted">Pessoas que pediram contato pelo site. Trate como dados pessoais: não exporte nem compartilhe sem necessidade.</p>
        </div>
      </header>
      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUSES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={advisor} onChange={(e) => setAdvisor(e.target.value as typeof advisor)}>
          <option value="">Todas as mentoras</option>
          {(Object.keys(ADVISORS) as AdvisorKey[]).map((k) => (
            <option key={k} value={k}>
              {ADVISORS[k].name}
            </option>
          ))}
        </select>
      </div>
      {rows === null ? (
        <div className="spinner" />
      ) : rows.length === 0 ? (
        <p className="empty card">Nenhum lead por aqui.</p>
      ) : (
        <ul className="lead-list">
          {rows.map((l) => (
            <li key={l.id} className={`lead-item card${open === l.id ? " open" : ""}`}>
              <button className="lead-row" onClick={() => setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id}>
                <span className="lead-name">{l.full_name}</span>
                <span className="muted small">{l.program_interest ?? "—"}</span>
                <span className="small">{ADVISORS[l.routed_to].name}</span>
                <span className={`badge badge-lead-${l.status}`}>{STATUSES[l.status]}</span>
                <span className="muted small nowrap">{new Date(l.created_at).toLocaleDateString("pt-BR")}</span>
              </button>
              {open === l.id && (
                <div className="lead-detail">
                  <dl>
                    <dt>Quem preencheu</dt>
                    <dd>{l.submitter_role === "guardian" ? "Responsável" : "Estudante"}</dd>
                    <dt>E-mail</dt>
                    <dd>{l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : "—"}</dd>
                    <dt>Telefone</dt>
                    <dd>
                      {l.phone_e164 ? (
                        <a href={`https://wa.me/${l.phone_e164.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                          {l.phone_e164} ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                    <dt>Região</dt>
                    <dd>{l.region ?? "—"}</dd>
                    <dt>Mensagem</dt>
                    <dd className="pre">{l.message ?? "—"}</dd>
                  </dl>
                  <div className="lead-actions">
                    <label className="field">
                      <span>Status</span>
                      <select value={l.status} onChange={(e) => void update(l.id, { status: e.target.value as Lead["status"] })}>
                        {Object.entries(STATUSES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Notas internas</span>
                      <textarea rows={3} maxLength={2000} defaultValue={l.notes ?? ""} onBlur={(e) => e.target.value !== (l.notes ?? "") && void update(l.id, { notes: e.target.value || null })} />
                    </label>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
