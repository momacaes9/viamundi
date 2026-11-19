import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { coverUrl, supabase } from "../lib/supabase";
import { formatDate } from "../lib/content";
import { useDocumentTitle, useLang, useT } from "../lib/i18n";

export type PostCard = {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  cover_image_path: string | null;
  reading_minutes: number;
  published_at: string;
};

export function BlogIndex() {
  const t = useT();
  const { lang } = useLang();
  useDocumentTitle("Blog", t({ pt: "Guias e histórias sobre admissões internacionais.", en: "Guides and stories about international admissions." }));
  const [params, setParams] = useSearchParams();
  const category = params.get("c") ?? "";
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);
  const [posts, setPosts] = useState<PostCard[] | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    supabase
      .from("posts")
      .select("category")
      .eq("status", "published")
      .not("category", "is", null)
      .then(({ data }) => setAllCategories([...new Set((data ?? []).map((r) => r.category as string))].sort()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPosts(null);
    let query = supabase
      .from("posts")
      .select("slug,title,excerpt,category,cover_image_path,reading_minutes,published_at")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(50);
    if (category) query = query.eq("category", category);
    if (q.trim()) query = query.textSearch("search", q.trim(), { type: "websearch", config: "simple" });
    query.then(({ data, error }) => {
      if (cancelled) return;
      setFailed(Boolean(error));
      setPosts((data as PostCard[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [category, q]);

  // Debounced search → URL (so searches are shareable and the back button works)
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (search === q) return;
      const next = new URLSearchParams(params);
      if (search.trim()) next.set("q", search.trim().slice(0, 100));
      else next.delete("q");
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCategory = (c: string) => {
    const next = new URLSearchParams(params);
    if (c) next.set("c", c);
    else next.delete("c");
    setParams(next);
  };

  const [featured, rest] = useMemo(() => {
    if (!posts?.length || category || q) return [null, posts ?? []];
    return [posts[0], posts.slice(1)];
  }, [posts, category, q]);

  return (
    <section className="page">
      <header className="page-head">
        <p className="eyebrow">Blog</p>
        <h1 className="h-serif xl">
          {t({ pt: "Ideias para o seu ", en: "Ideas for your " })}
          <em>{t({ pt: "caminho", en: "path" })}</em>
        </h1>
        <p className="lead">{t({ pt: "Guias práticos sobre admissões, bolsas, essays e vida no exterior.", en: "Practical guides on admissions, scholarships, essays and life abroad." })}</p>
      </header>

      <div className="blog-tools">
        <div className="chips" role="tablist" aria-label={t({ pt: "Categorias", en: "Categories" })}>
          <button className={`chip${!category ? " on" : ""}`} onClick={() => setCategory("")} role="tab" aria-selected={!category}>
            {t({ pt: "Todos", en: "All" })}
          </button>
          {allCategories.map((c) => (
            <button key={c} className={`chip${category === c ? " on" : ""}`} onClick={() => setCategory(c)} role="tab" aria-selected={category === c}>
              {c}
            </button>
          ))}
        </div>
        <label className="search">
          <span className="sr-only">{t({ pt: "Buscar", en: "Search" })}</span>
          <input type="search" placeholder={t({ pt: "Buscar artigos…", en: "Search articles…" })} value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {posts === null ? (
        <div className="post-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="post-card skeleton" />
          ))}
        </div>
      ) : failed ? (
        <p className="empty">{t({ pt: "Não foi possível carregar os artigos. Tente novamente.", en: "Couldn't load articles. Please try again." })}</p>
      ) : posts.length === 0 ? (
        <p className="empty">{q || category ? t({ pt: "Nenhum artigo encontrado.", en: "No articles found." }) : t({ pt: "Os primeiros artigos chegam em breve.", en: "First articles coming soon." })}</p>
      ) : (
        <>
          {featured && <PostTile post={featured} lang={lang} featured />}
          <div className="post-grid">
            {rest.map((p) => (
              <PostTile key={p.slug} post={p} lang={lang} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function PostTile({ post, lang, featured }: { post: PostCard; lang: "pt" | "en"; featured?: boolean }) {
  const cover = coverUrl(post.cover_image_path);
  return (
    <Link to={`/blog/${post.slug}`} className={`post-card${featured ? " featured" : ""}`}>
      <div className="post-cover">{cover ? <img src={cover} alt="" loading="lazy" /> : <div className="cover-fallback" aria-hidden="true" />}</div>
      <div className="post-body">
        <p className="post-meta">
          {post.category && <span className="tag">{post.category}</span>}
          <span>{formatDate(post.published_at, lang)}</span>
          <span>· {post.reading_minutes} min</span>
        </p>
        <h2 className="h-serif">{post.title}</h2>
        {post.excerpt && <p className="muted">{post.excerpt}</p>}
      </div>
    </Link>
  );
}
