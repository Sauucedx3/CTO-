# ChangelogSync

Turn merged GitHub pull requests into polished, public release notes — automatically.

This is the **milestone 1 foundation**: a Next.js (App Router) + TypeScript app with
Supabase schema (RLS on every table), shared domain types, mock webhook fixtures, and
a minimal page shell. Later milestones add GitHub OAuth, the webhook listener, the AI
summary pipeline, the public changelog timeline, the embeddable widget, and Stripe
billing.

## Stack

- **Next.js 16** (App Router) + **TypeScript** (strict) run with **bun** 1.4.2
- **Tailwind CSS v4** + **shadcn/ui** (radix base): button, card, input, badge,
  switch, dialog, dropdown-menu, select, tabs, skeleton, separator, sonner
- **Lucide** icons
- **Supabase** (Postgres schema + RLS, migrations under `supabase/migrations/`)
- **@supabase/supabase-js** and **pg** (seed runner) — used from milestone 2 on

## Quickstart

```bash
bun install          # install dependencies
cp .env.example .env.local  # fill in real values; dummies are fine to build
bun run dev          # local dev server
```

## Scripts

| Script                | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| `bun run dev`         | Start the Next.js dev server                        |
| `bun run build`       | Production build (verified in CI/local)             |
| `bun run start`       | Serve the production build                          |
| `bun run lint`        | ESLint (flat config)                                |
| `bun run typecheck`   | `tsc --noEmit`                                      |
| `bun run seed`        | Apply `supabase/seed.sql` to the DB at `DATABASE_URL` |

## Database

- `supabase/migrations/0001_init.sql` — tables, enums, indexes, **RLS enabled on
  every table**, owner policies (`auth.uid()`), public read policies for the
  `/c/[slug]` changelog page, signup trigger, and role grants.
  Apply with `supabase db push` or paste into the Supabase SQL editor.
- `supabase/seed.sql` — idempotent demo data: one workspace (`acme`), one
  connected repo, six changelog entries across all categories, one webhook event.

## Layout

```
src/
  app/                # routes: / (landing), /dashboard (placeholder)
  components/ui/      # shadcn/ui components
  lib/
    types.ts          # Profile, Workspace, ConnectedRepo, ChangelogEntry, WebhookEvent, …
    mocks/            # GitHub pull_request.closed fixtures + sample entries
scripts/seed.ts       # seed runner (needs DATABASE_URL)
supabase/
  migrations/         # 0001_init.sql
  seed.sql
.env.example          # every env var, documented
```

## Environment variables

See [`.env.example`](.env.example) — every variable has a one-line comment.
Public vars are `NEXT_PUBLIC_*`; everything else is server-only.