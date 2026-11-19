-- Seed data. Replace the <...> placeholders before running.

-- 1. Editor allowlist (only these two accounts can open /editor)
insert into public.editors (email, display_name, advisor) values
  ('<julia-login-email>',  'Júlia Pasa Tomasi', 'julia'),
  ('<monica-login-email>', 'Monica Macaes',     'monica')
on conflict (email) do nothing;

-- 2. Programs (prices are read server-side by /api/checkout)
insert into public.programs (slug, name_pt, name_en, price_cents, currency, sort_order) values
  ('<program-slug>', '<Nome PT>', '<Name EN>', 0 /* <price in cents> */, 'usd', 1)
on conflict (slug) do nothing;

-- 3. Existing blog articles — paste each draft's Markdown between the $md$ markers.
insert into public.posts (slug, locale, title, excerpt, category, content_md, status, published_at) values
  ('<slug-1>', 'pt', '<Título 1>', '<Resumo 1>', '<Categoria>', $md$
<cole o artigo 1 aqui>
$md$, 'published', now()),
  ('<slug-2>', 'pt', '<Título 2>', '<Resumo 2>', '<Categoria>', $md$
<cole o artigo 2 aqui>
$md$, 'published', now()),
  ('<slug-3>', 'pt', '<Título 3>', '<Resumo 3>', '<Categoria>', $md$
<cole o artigo 3 aqui>
$md$, 'published', now())
on conflict (slug) do nothing;
