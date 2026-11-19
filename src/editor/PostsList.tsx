import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatDate } from "../lib/content";

type Row = { id: string; title: string; slug: string; status: "draft" | "published" | "archived"; published_at: string | null; updated_at: string; category: string | null };

const STATUS_LABEL = { draft: "Rascunho", published: "Publicado", archived: "Arquivado" } as const;

export function PostsList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"" | Row["status"]>("");

  useEffect(() => {
    let q = supabase.from("posts").select("id,title,slug,status,published_at,updated_at,category").order("updated_at", { ascending: false });
    if (filter) q = q.eq("status", filter);
    q.then(({ data, error: e }) => {
      setError(Boolean(e));
      setRows((data as Row[]) ?? []);
    });
  }, [filter]);

  return (
    <div className="ed-page">
      <header className="ed-head">
        <div>
          <h1 className="h-serif">Artigos</h1>
          <p className="muted">Rascunhos ficam visíveis só para a equipe.</p>
        </div>
        <Link to="/editor/posts/novo" className="btn btn-primary">
          + Novo artigo
        </Link>
      </header>
      <div className="chips">
        {(["", "draft", "published", "archived"] as const).map((s) => (
          <button key={s} className={`chip${filter === s ? " on" : ""}`} onClick={() => setFilter(s)}>
            {s ? STATUS_LABEL[s] : "Todos"}
          </button>
        ))}
      </div>
      {rows === null ? (
        <div className="spinner" />
      ) : error ? (
        <p className="form-error">Erro ao carregar artigos.</p>
      ) : rows.length === 0 ? (
        <div className="empty card">
          <p>Nenhum artigo ainda.</p>
          <Link to="/editor/posts/novo" className="btn btn-primary">
            Escrever o primeiro
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Status</th>
                <th>Categoria</th>
                <th>Atualizado</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/editor/posts/${r.id}`} className="row-title">
                      {r.title}
                    </Link>
                    <div className="muted small">/blog/{r.slug}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                  <td>{r.category ?? "—"}</td>
                  <td className="nowrap">{formatDate(r.updated_at, "pt")}</td>
                  <td className="nowrap">
                    {r.status === "published" && (
                      <a href={`/blog/${r.slug}`} target="_blank" rel="noopener noreferrer" className="link-btn">
                        Ver ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
