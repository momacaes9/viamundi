# Viamundi Education

Site + backend for Viamundi: landing page, blog, WhatsApp lead routing, Stripe checkout and a
private editor panel for Monica and Julia.

**Stack:** Vite + React + TypeScript · Supabase (Postgres + Auth + Storage, all behind Row-Level
Security) · Stripe Checkout (card + Venmo) · Vercel (static site + `/api` functions).

## Pages

| URL | What |
|---|---|
| `/` | Landing page (ported from the Lovable design, `index.html`) |
| `/blog`, `/blog/:slug` | Published articles, category filter, full-text search |
| `/contato` (`/whatsapp`) | Lead form → saved to Supabase → pre-filled WhatsApp to Júlia (BR) or Monica (US/intl) |
| `/programas` | Active programs → Stripe Checkout |
| `/privacidade` | Privacy policy (LGPD + COPPA) |
| `/editor` | Passwordless login; articles, leads, payments. Only emails in the `editors` table get in |

## Security model (short version)

- **The database is the guard, not the page.** RLS on every table: visitors can read published
  posts and insert a lead, nothing else. Editors are checked with `is_editor()` against the
  `editors` allowlist. Tested: a signed-in non-editor gets empty results / 403 on leads, orders,
  drafts, editor list and post writes, even when calling the API directly.
- **No passwords.** Editors sign in with a 6-digit email code or magic link (PKCE). Sign-ups are
  disabled; the login form never creates accounts and gives the same answer for unknown emails.
  1-hour idle sign-out.
- **Payments:** prices come from the database, never from the browser. Orders become `paid` only
  through the signature-verified Stripe webhook (idempotent, amount-checked).
- **No secrets in the frontend.** Only `VITE_*` publishable values reach the browser. Service-role
  and Stripe keys live in Vercel env vars, used only in `/api`.
- **Headers:** strict CSP (no inline scripts), HSTS, `X-Frame-Options: DENY`, no-index on `/editor`.
- **Content:** Markdown is sanitized with DOMPurify (tests cover script/onerror/javascript: attacks).
  Cover uploads: editors only, images only (no SVG/HTML), 5 MB max, random file names.
- **Leads:** consent + version + timestamp stored (LGPD art. 8), "student 13+ / guardian" instead
  of birth date (COPPA), honeypot + global rate limit against spam.

## Run locally

```bash
npm install
supabase start                 # needs Docker; applies supabase/migrations
cp .env.example .env.local     # fill VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from `supabase status`
npm run dev                    # http://localhost:5173
npm test                       # unit tests
npm run test:integration       # Stripe webhook against local Supabase (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
```

## Go-live checklist

1. **Supabase project** (one for staging, one for production): run `supabase link` then
   `supabase db push` to apply the migrations.
   - Auth → Providers → Email: **disable sign-ups**.
   - Auth → URL config: Site URL = your domain; redirect URL = `https://<domain>/editor`.
   - Auth → Email templates → Magic Link: paste `supabase/templates/magic_link.html`.
   - Auth → SMTP: connect a real email sender (the built-in one is rate-limited).
   - Auth → Users → **Invite** Monica and Julia, then add their emails to `editors`
     (see `supabase/seed.sql`).
2. **Stripe:** enable Card + Venmo in Payment methods. Webhook endpoint
   `https://<domain>/api/webhooks/stripe` with the events listed at the top of
   `api/webhooks/stripe.ts`.
3. **Vercel env vars** (Production and Preview separately, never committed):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`.
4. Add programs and the 3 blog articles in `/editor` (or `supabase/seed.sql`).
5. Have a lawyer review `/privacidade` before launch.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
