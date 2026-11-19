-- Via Mundi Education — core schema (applied to project "viamundi" on 2026-11-19)
-- Tables: editors, profiles, programs, posts, leads, orders
-- Principle: anon can read published content + create leads. Everything else
-- is editor-only, and payment state is written ONLY by the service role
-- (Stripe webhook), never by a browser.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "citext" with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.post_status   as enum ('draft', 'published', 'archived');
create type public.lead_status   as enum ('new', 'contacted', 'qualified', 'enrolled', 'lost');
create type public.advisor_key   as enum ('julia', 'monica');
create type public.order_status  as enum ('pending', 'paid', 'failed', 'refunded', 'canceled');
create type public.pay_method    as enum ('stripe', 'venmo_manual');

-- ---------------------------------------------------------------------------
-- editors: allowlist. Only emails here can use /editor. Seeded by hand.
-- ---------------------------------------------------------------------------
create table public.editors (
  email       extensions.citext primary key,
  display_name text not null,
  advisor     public.advisor_key,
  created_at  timestamptz not null default now()
);

-- SECURITY DEFINER so RLS policies on other tables can call it without
-- granting anyone read access to the editors table itself.
create or replace function public.is_editor()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.editors e
    where e.email = (auth.jwt() ->> 'email')::extensions.citext
  );
$$;
revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users (editors today; students later if needed)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- programs: the source of truth for prices. /api/checkout looks the price up
-- here by slug — the browser never sends an amount.
-- ---------------------------------------------------------------------------
create table public.programs (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null check (slug ~ '^[a-z0-9-]+$'),
  name_pt         text not null,
  name_en         text not null,
  description_pt  text,
  description_en  text,
  price_cents     integer not null check (price_cents > 0),
  currency        text not null default 'usd' check (currency in ('usd', 'brl')),
  stripe_price_id text,                    -- optional: use a Stripe Price instead of price_data
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- posts: blog / CMS
-- ---------------------------------------------------------------------------
create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  locale           text not null default 'pt' check (locale in ('pt', 'en')),
  title            text not null check (char_length(title) between 3 and 200),
  excerpt          text check (char_length(excerpt) <= 400),
  content_md       text not null default '',
  cover_image_path text,                   -- path inside the 'post-covers' bucket
  category         text,
  tags             text[] not null default '{}',
  reading_minutes  integer generated always as
                     (greatest(1, ceil(array_length(regexp_split_to_array(trim(content_md), '\s+'), 1) / 220.0)::int)) stored,
  seo_title        text check (char_length(seo_title) <= 70),
  seo_description  text check (char_length(seo_description) <= 160),
  status           public.post_status not null default 'draft',
  published_at     timestamptz,
  author_id        uuid references public.profiles(id) on delete set null,
  search           tsvector generated always as (
                     setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
                     setweight(to_tsvector('simple', coalesce(excerpt, '')), 'B') ||
                     setweight(to_tsvector('simple', coalesce(content_md, '')), 'C')
                   ) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint published_needs_date check (status <> 'published' or published_at is not null)
);
create index posts_public_idx   on public.posts (status, published_at desc);
create index posts_category_idx on public.posts (category);
create index posts_search_idx   on public.posts using gin (search);

-- ---------------------------------------------------------------------------
-- leads: WhatsApp / contact form submissions
-- ---------------------------------------------------------------------------
create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null check (char_length(full_name) between 2 and 120),
  email             extensions.citext check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone_e164        text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  program_interest  text check (char_length(program_interest) <= 120),
  message           text check (char_length(message) <= 2000),
  region            text check (region in ('BR', 'US', 'INTL')),
  routed_to         public.advisor_key not null,
  locale            text not null default 'pt' check (locale in ('pt', 'en')),
  utm               jsonb not null default '{}'::jsonb,
  submitter_role    text not null check (submitter_role in ('student', 'guardian')),  -- student = 13+ (COPPA)
  consent_version   text not null check (char_length(consent_version) <= 20),        -- which privacy text was accepted (LGPD art. 8 §2)
  consented_at      timestamptz not null default now(),
  status            public.lead_status not null default 'new',
  notes             text,                  -- internal, editor-only
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index leads_created_idx on public.leads (created_at desc);

-- Spam brake: anonymous inserts are capped globally (bots can't flood the inbox).
create or replace function public.leads_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.leads where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  new.status := 'new';          -- never trust client-supplied workflow fields
  new.notes  := null;
  new.consented_at := now();
  return new;
end; $$;
create trigger leads_rate_limit before insert on public.leads
  for each row when (current_user in ('anon', 'authenticated')) execute function public.leads_rate_limit();
create index leads_routed_idx  on public.leads (routed_to, status);

-- ---------------------------------------------------------------------------
-- orders: enrollments / payments
-- ---------------------------------------------------------------------------
create table public.orders (
  id                         uuid primary key default gen_random_uuid(),
  program_id                 uuid not null references public.programs(id),
  lead_id                    uuid references public.leads(id) on delete set null,
  customer_email             extensions.citext not null,
  customer_name              text,
  amount_cents               integer not null check (amount_cents > 0),
  currency                   text not null,
  method                     public.pay_method not null default 'stripe',
  status                     public.order_status not null default 'pending',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id   text unique,
  venmo_reference            text,         -- manual P2P: note/txn id the editor verified
  verified_by                extensions.citext references public.editors(email),
  paid_at                    timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);

-- Stripe retries webhooks: record each event id once so processing is idempotent.
create table public.stripe_events (
  id           text primary key,           -- evt_...
  type         text not null,
  received_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create trigger t_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger t_programs before update on public.programs for each row execute function public.touch_updated_at();
create trigger t_posts    before update on public.posts    for each row execute function public.touch_updated_at();
create trigger t_leads    before update on public.leads    for each row execute function public.touch_updated_at();
create trigger t_orders   before update on public.orders   for each row execute function public.touch_updated_at();

-- ===========================================================================
-- ROW-LEVEL SECURITY
-- ===========================================================================
alter table public.editors       enable row level security;
alter table public.profiles      enable row level security;
alter table public.programs      enable row level security;
alter table public.posts         enable row level security;
alter table public.leads         enable row level security;
alter table public.orders        enable row level security;
alter table public.stripe_events enable row level security;  -- no policies = service role only

-- editors: editors can see the allowlist; nobody can change it from the client
create policy editors_read on public.editors
  for select to authenticated using (public.is_editor());

-- profiles: own row, or editors see all
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_editor());
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- programs: public reads active programs; editors manage
create policy programs_public_read on public.programs
  for select to anon, authenticated using (is_active or public.is_editor());
create policy programs_editor_write on public.programs
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- posts: public reads ONLY published + already-live posts; editors do everything
create policy posts_public_read on public.posts
  for select to anon, authenticated
  using ((status = 'published' and published_at <= now()) or public.is_editor());
create policy posts_editor_insert on public.posts
  for insert to authenticated with check (public.is_editor());
create policy posts_editor_update on public.posts
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy posts_editor_delete on public.posts
  for delete to authenticated using (public.is_editor());

-- leads: anyone may INSERT a fresh lead (cannot set status/notes); only editors read/update
create policy leads_public_insert on public.leads
  for insert to anon, authenticated
  with check (status = 'new' and notes is null);
create policy leads_editor_read on public.leads
  for select to authenticated using (public.is_editor());
create policy leads_editor_update on public.leads
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

-- orders: NO client insert. Rows are created by /api/checkout and marked paid by
-- /api/webhooks/stripe, both using the service role (bypasses RLS).
-- Editors can read all and may only verify manual Venmo orders.
create policy orders_editor_read on public.orders
  for select to authenticated using (public.is_editor());
create policy orders_editor_verify_venmo on public.orders
  for update to authenticated
  using (public.is_editor() and method = 'venmo_manual')
  with check (public.is_editor() and method = 'venmo_manual');

-- Column-level hardening: anon cannot read lead/order PII even if a policy slips.
revoke select on public.leads  from anon;
revoke all    on public.orders from anon;
revoke all    on public.stripe_events from anon, authenticated;

-- ===========================================================================
-- STORAGE: cover images (public read, editor write)
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-covers', 'post-covers', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy covers_editor_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'post-covers' and public.is_editor());
create policy covers_editor_update on storage.objects
  for update to authenticated using (bucket_id = 'post-covers' and public.is_editor());
create policy covers_editor_delete on storage.objects
  for delete to authenticated using (bucket_id = 'post-covers' and public.is_editor());
