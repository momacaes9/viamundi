# Via Mundi — Production Architecture (proposal)

## Audit findings (2026-11-18)

| Item | Finding | Impact |
|---|---|---|
| GitHub `momacaes9/viamundi` | Public repo, 1 commit (README + .gitignore). **Lovable is not pushing to it.** | No source to version yet. Connect Lovable → GitHub first. |
| Live site | Single-page Vite + React SPA (Lovable default), PT/EN toggle, anchor sections + `/oportunidades`. CTAs go to Google Calendar and `mailto:`. No WhatsApp, blog, checkout, or admin. | Everything in sections 3–5 is net-new. |
| Supabase in bundle | Client points at `efcjbmcwglhjijplnqoh.supabase.co` with a **publishable** key (fine, public by design). | — |
| Supabase in screenshot | `vjbnvwmiypmdualrbeqb` — a **different** project, showing 25 Postgres errors / 67% success. | Two projects in play. Need to know which is canonical. |
| Supabase MCP access | Neither project is in the connected org (only `osda` and the hackathon project are). | Can't inspect tables/logs remotely; likely Lovable Cloud-managed. |

## Decision (2026-11-19): this repo is the source of truth

Lovable's Git sync needs workspace-admin rights and always creates its own repo, so the site was
rebuilt here from the Lovable design export (`index.html` = landing page, unchanged design).
Lovable stays as-is until this version is deployed; after that, edits happen here through PRs.

```
viamundi/
├── index.html                 # landing page (static, fast, no framework)
├── app.html + src/main.tsx    # React app for /blog, /contato, /programas, /privacidade, /checkout, /editor
├── src/
│   ├── landing/landing.ts     # PT/EN toggle, mobile menu, scroll reveals (no inline JS → strict CSP)
│   ├── auth/                  # Supabase session, idle sign-out, editor guard (UI only; RLS is the real guard)
│   ├── pages/                 # public pages
│   ├── editor/                # login (email code / magic link), articles, leads, payments
│   ├── lib/                   # supabase client, whatsapp routing, markdown sanitizer, payments
│   └── styles/                # landing.css (original) + app.css (same tokens)
├── api/                       # Vercel functions: checkout + Stripe webhook (server-only secrets)
├── supabase/
│   ├── migrations/            # schema + RLS + storage policies
│   ├── templates/magic_link.html
│   └── seed.sql               # editors, programs, the 3 blog drafts
├── tests/                     # unit + webhook integration tests
└── vercel.json                # rewrites + security headers
```

## Branches & environments

- `main` → Vercel Production → Supabase **prod** project
- `staging` → Vercel Preview (branch domain) → Supabase **staging** project (or Supabase Branching)
- `feat/payments`, `feat/cms-blog`, `feat/whatsapp-routing` → PR into `staging`
- Protect `main` (PR required). Migrations applied via `supabase db push` per environment, never via dashboard edits.

## Env vars (names only)

| Name | Where | Exposed to browser? |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel (all envs) | yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel (all envs) | yes (RLS protects data) |
| `SUPABASE_URL` | Vercel (all envs), same value as `VITE_SUPABASE_URL` | n/a (server copy) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel, Production + Preview, **Sensitive** | **never** |
| `STRIPE_SECRET_KEY` | test key in Preview, live key in Production | **never** |
| `STRIPE_WEBHOOK_SECRET` | per environment (each endpoint has its own) | **never** |
| `APP_URL` | per environment, for Stripe success/cancel URLs | n/a |

Set them yourself with `vercel env add <NAME> <environment>` or the dashboard — don't paste secret values into chat.

## Payments

- Stripe Checkout with `payment_method_types` managed via Dashboard (enable Card + **Venmo**; Venmo is US/USD only).
- `/api/checkout`: looks up `programs.price_cents` server-side → inserts `orders(status=pending)` → creates Session with `metadata.order_id` → returns URL.
- `/api/webhooks/stripe`: `stripe.webhooks.constructEvent(rawBody, sig, secret)` → skip if `stripe_events.id` exists → on `checkout.session.completed` set `status=paid, paid_at, payment_intent_id`.
- Manual Venmo fallback: `venmo://paycharge?txn=pay&recipients=<handle>&amount=<x>&note=VM-<orderId>`; editor matches the note and clicks **Verify** (RLS allows editors to update only `venmo_manual` orders). Unofficial Venmo APIs: not used.

## WhatsApp routing

| Advisor | E.164 | Link |
|---|---|---|
| Júlia (Brasil) | `+5547991795200` | `https://wa.me/5547991795200` |
| Monica (US / International) | `+19195937405` | `https://wa.me/19195937405` |

Rule: student picks region → `BR` ⇒ Júlia, `US`/`INTL` ⇒ Monica; "no preference" ⇒ round-robin by
`leads` count of the day. Lead row is inserted first, then the browser opens
`https://wa.me/<number>?text=<encodeURIComponent(message)>`. Message text contains only what
the student typed (name, program, message) — no internal IDs or metadata.
