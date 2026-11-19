import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { COVER_BUCKET, coverUrl, supabase } from "../lib/supabase";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, readingMinutes, renderMarkdown, slugify } from "../lib/content";
import { useAuth } from "../auth/AuthProvider";

type Status = "draft" | "published" | "archived";
type Draft = {
  title: string;
  slug: string;
  locale: "pt" | "en";
  excerpt: string;
  content_md: string;
  category: string;
  tags: string;
  cover_image_path: string | null;
  seo_title: string;
  seo_description: string;
  status: Status;
  published_at: string | null;
};

const EMPTY: Draft = {
  title: "",
  slug: "",
  locale: "pt",
  excerpt: "",
  content_md: "",
  category: "",
  tags: "",
  cover_image_path: null,
  seo_title: "",
  seo_description: "",
  status: "draft",
  published_at: null,
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function PostEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { session } = useAuth();
  const [d, setD] = useState<Draft>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isNew) return;
    if (!UUID.test(id!)) return setNotFound(true);
    supabase
      .from("posts")
      .select("title,slug,locale,excerpt,content_md,category,tags,cover_image_path,seo_title,seo_description,status,published_at")
      .eq("id", id!)
      .maybeSingle()
      .then(({ data }) => {
        setLoading(false);
        if (!data) return setNotFound(true);
        setD({
          ...EMPTY,
          ...data,
          excerpt: data.excerpt ?? "",
          category: data.category ?? "",
          seo_title: data.seo_title ?? "",
          seo_description: data.seo_description ?? "",
          tags: (data.tags ?? []).join(", "),
        });
        setSlugTouched(true);
      });
  }, [id, isNew]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const preview = useMemo(() => (tab === "preview" ? renderMarkdown(d.content_md) : ""), [tab, d.content_md]);

  function onTitle(v: string) {
    setD((x) => ({ ...x, title: v, slug: slugTouched ? x.slug : slugify(v) }));
  }

  async function onCover(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    if (!IMAGE_TYPES.includes(file.type)) return setMsg({ kind: "err", text: "Use JPG, PNG, WebP ou AVIF." });
    if (file.size > MAX_IMAGE_BYTES) return setMsg({ kind: "err", text: "Imagem maior que 5 MB." });
    setUploading(true);
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`; // random name: no user-controlled paths
    const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    setUploading(false);
    if (error) return setMsg({ kind: "err", text: "Falha no upload da imagem." });
    set("cover_image_path", path);
  }

  async function save(e: FormEvent, nextStatus?: Status) {
    e.preventDefault();
    setMsg(null);
    const status = nextStatus ?? d.status;
    const slug = slugify(d.slug || d.title);
    if (d.title.trim().length < 3) return setMsg({ kind: "err", text: "O título precisa de pelo menos 3 caracteres." });
    if (!slug) return setMsg({ kind: "err", text: "Slug inválido." });
    const row = {
      title: d.title.trim(),
      slug,
      locale: d.locale,
      excerpt: d.excerpt.trim() || null,
      content_md: d.content_md,
      category: d.category.trim() || null,
      tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12),
      cover_image_path: d.cover_image_path,
      seo_title: d.seo_title.trim() || null,
      seo_description: d.seo_description.trim() || null,
      status,
      published_at: status === "published" ? d.published_at ?? new Date().toISOString() : d.published_at,
    };
    setSaving(true);
    const res = isNew
      ? await supabase.from("posts").insert({ ...row, author_id: session?.user.id ?? null }).select("id").single()
      : await supabase.from("posts").update(row).eq("id", id!).select("id").single();
    setSaving(false);
    if (res.error) {
      const dup = res.error.code === "23505";
      return setMsg({ kind: "err", text: dup ? "Já existe um artigo com esse slug." : "Não foi possível salvar." });
    }
    setD((x) => ({ ...x, slug, status, published_at: row.published_at }));
    setMsg({ kind: "ok", text: status === "published" ? "Publicado ✓" : "Salvo ✓" });
    if (isNew) navigate(`/editor/posts/${res.data.id}`, { replace: true });
  }

  async function remove() {
    if (!id) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return setMsg({ kind: "err", text: "Não foi possível excluir." });
    navigate("/editor/posts", { replace: true });
  }

  if (loading) return <div className="spinner" />;
  if (notFound)
    return (
      <div className="ed-page">
        <p className="empty">Artigo não encontrado.</p>
        <Link to="/editor/posts">← Artigos</Link>
      </div>
    );

  const cover = coverUrl(d.cover_image_path);
  return (
    <form className="ed-page editor-form" onSubmit={(e) => void save(e)}>
      <header className="ed-head sticky">
        <div>
          <Link to="/editor/posts" className="back-link">
            ← Artigos
          </Link>
          <span className={`badge badge-${d.status}`}>{d.status === "published" ? "Publicado" : d.status === "draft" ? "Rascunho" : "Arquivado"}</span>
        </div>
        <div className="btn-row">
          {msg && <span className={msg.kind === "ok" ? "ok-text" : "form-error"} role="status">{msg.text}</span>}
          <button className="btn btn-ghost" disabled={saving}>
            Salvar
          </button>
          {d.status !== "published" ? (
            <button type="button" className="btn btn-primary" disabled={saving} onClick={(e) => void save(e as unknown as FormEvent, "published")}>
              Publicar
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={(e) => void save(e as unknown as FormEvent, "draft")}>
              Despublicar
            </button>
          )}
        </div>
      </header>

      <div className="editor-grid">
        <div className="editor-main">
          <textarea className="title-input" rows={1} placeholder="Título do artigo" value={d.title} onChange={(e) => onTitle(e.target.value.replace(/\n/g, " "))} maxLength={200} />
          <textarea className="excerpt-input" placeholder="Resumo (aparece na lista do blog)" rows={2} maxLength={400} value={d.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          <div className="tabs">
            <button type="button" className={tab === "write" ? "on" : ""} onClick={() => setTab("write")}>
              Escrever
            </button>
            <button type="button" className={tab === "preview" ? "on" : ""} onClick={() => setTab("preview")}>
              Pré-visualizar
            </button>
            <span className="muted small">
              Markdown · {readingMinutes(d.content_md)} min de leitura
            </span>
          </div>
          {tab === "write" ? (
            <textarea
              className="md-input"
              value={d.content_md}
              onChange={(e) => set("content_md", e.target.value)}
              placeholder={"## Subtítulo\n\nEscreva aqui. **negrito**, *itálico*, [link](https://…), listas com -"}
            />
          ) : (
            <div className="prose preview" dangerouslySetInnerHTML={{ __html: preview }} />
          )}
        </div>

        <aside className="editor-side">
          <div className="card">
            <h3>Publicação</h3>
            <label className="field">
              <span>Slug (URL)</span>
              <div className="slug-field">
                <span>/blog/</span>
                <input
                  value={d.slug}
                  maxLength={80}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                />
              </div>
            </label>
            <label className="field">
              <span>Idioma</span>
              <select value={d.locale} onChange={(e) => set("locale", e.target.value as "pt" | "en")}>
                <option value="pt">Português</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="field">
              <span>Categoria</span>
              <input value={d.category} maxLength={60} onChange={(e) => set("category", e.target.value)} placeholder="Ex.: Bolsas" />
            </label>
            <label className="field">
              <span>Tags (separadas por vírgula)</span>
              <input value={d.tags} maxLength={300} onChange={(e) => set("tags", e.target.value)} />
            </label>
            <label className="field">
              <span>Data de publicação</span>
              <input
                type="datetime-local"
                value={d.published_at ? toLocalInput(d.published_at) : ""}
                onChange={(e) => set("published_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
              <small className="muted">Data futura = agendado.</small>
            </label>
          </div>

          <div className="card">
            <h3>Imagem de capa</h3>
            {cover ? <img className="cover-preview" src={cover} alt="" /> : <div className="cover-empty">Sem imagem</div>}
            <label className="btn btn-ghost btn-block file-btn">
              {uploading ? "Enviando…" : cover ? "Trocar imagem" : "Enviar imagem"}
              <input type="file" accept={IMAGE_TYPES.join(",")} onChange={(e) => void onCover(e.target.files?.[0])} disabled={uploading} />
            </label>
            {cover && (
              <button type="button" className="link-btn" onClick={() => set("cover_image_path", null)}>
                Remover capa
              </button>
            )}
          </div>

          <div className="card">
            <h3>SEO</h3>
            <label className="field">
              <span>Título SEO <small className="muted">({d.seo_title.length}/70)</small></span>
              <input value={d.seo_title} maxLength={70} onChange={(e) => set("seo_title", e.target.value)} />
            </label>
            <label className="field">
              <span>Descrição <small className="muted">({d.seo_description.length}/160)</small></span>
              <textarea rows={3} value={d.seo_description} maxLength={160} onChange={(e) => set("seo_description", e.target.value)} />
            </label>
          </div>

          {!isNew && (
            <div className="card danger-zone">
              {confirmDelete ? (
                <>
                  <p className="small">Excluir definitivamente? Não dá para desfazer.</p>
                  <div className="btn-row">
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove()}>
                      Sim, excluir
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className="link-btn danger" onClick={() => setConfirmDelete(true)}>
                  Excluir artigo
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </form>
  );
}

function toLocalInput(iso: string) {
  const dt = new Date(iso);
  const off = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - off).toISOString().slice(0, 16);
}
