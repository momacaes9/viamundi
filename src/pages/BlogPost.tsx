import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { coverUrl, supabase } from "../lib/supabase";
import { formatDate, renderMarkdown } from "../lib/content";
import { useDocumentTitle, useLang, useT } from "../lib/i18n";
import { NotFound } from "./Simple";

type Post = {
  title: string;
  excerpt: string | null;
  content_md: string;
  category: string | null;
  tags: string[];
  cover_image_path: string | null;
  reading_minutes: number;
  published_at: string;
  seo_title: string | null;
  seo_description: string | null;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function BlogPost() {
  const { slug = "" } = useParams();
  const t = useT();
  const { lang } = useLang();
  const [post, setPost] = useState<Post | null | undefined>(undefined);

  useEffect(() => {
    if (!SLUG.test(slug)) return setPost(null); // reject odd URLs before touching the DB
    let cancelled = false;
    supabase
      .from("posts")
      .select("title,excerpt,content_md,category,tags,cover_image_path,reading_minutes,published_at,seo_title,seo_description")
      .eq("slug", slug)
      .eq("status", "published") // editors browsing the public site still only see live posts here
      .lte("published_at", new Date().toISOString())
      .maybeSingle()
      .then(({ data }) => !cancelled && setPost((data as Post) ?? null));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useDocumentTitle(post ? post.seo_title || post.title : "Blog", post ? post.seo_description || post.excerpt || undefined : undefined);
  const html = useMemo(() => (post ? renderMarkdown(post.content_md) : ""), [post]);

  if (post === undefined)
    return (
      <div className="ed-center">
        <div className="spinner" />
      </div>
    );
  if (post === null) return <NotFound />; // drafts and unknown slugs look identical (RLS hides drafts)

  const cover = coverUrl(post.cover_image_path);
  return (
    <article className="page article fade-in">
      <Link to="/blog" className="back-link">
        ← Blog
      </Link>
      <header className="article-head">
        <p className="post-meta">
          {post.category && <span className="tag">{post.category}</span>}
          <span>{formatDate(post.published_at, lang)}</span>
          <span>· {post.reading_minutes} {t({ pt: "min de leitura", en: "min read" })}</span>
        </p>
        <h1 className="h-serif xl">{post.title}</h1>
        {post.excerpt && <p className="lead">{post.excerpt}</p>}
      </header>
      {cover && <img className="article-cover" src={cover} alt="" />}
      {/* Sanitized with DOMPurify in renderMarkdown */}
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      <aside className="article-cta card">
        <h2 className="h-serif">{t({ pt: "Quer ajuda com o seu caminho?", en: "Want help with your path?" })}</h2>
        <p className="muted">{t({ pt: "Converse com uma mentora no WhatsApp.", en: "Chat with a mentor on WhatsApp." })}</p>
        <Link to="/contato" className="btn btn-wa">
          {t({ pt: "Falar no WhatsApp", en: "Chat on WhatsApp" })}
        </Link>
      </aside>
    </article>
  );
}
