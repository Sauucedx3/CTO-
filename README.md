# ChangelogSync

Turn merged GitHub pull requests into polished, public release notes — automatically.

This is the **milestone 2 build**: a Next.js (App Router) + TypeScript app with
Supabase schema (RLS on every table), shared domain types, mock webhook fixtures,
**GitHub OAuth onboarding (custom flow, `repo` + `read:user` scopes)**, and a
**repository dashboard** with per-repo changelog toggles (free tier: 1 enabled
repo). Later milestones add the webhook listener, the AI summary pipeline, the
public changelog timeline, the embeddable widget, and Stripe billing.

## Stack

- **Next.js 16** (App Router) + **TypeScript** (strict) run with **bun** 1.4.2
- **Tailwind CSS v4** + **shadcn/ui** (radix base): button, card, input, badge,
  switch, dialog, dropdown-menu, select, tabs, skeleton, separator, sonner
- **Lucide** icons
- **Supabase** (Postgres schema + RLS, migrations under `supabase/migrations/`)
- **@supabase/supabase-js**, **@supabase/ssr**, **@octokit/rest** (dashboard repo
  listing) and **pg** (seed runner)

## GitHub sign-in (milestone 2)

Sign-in is a **custom GitHub OAuth flow** (not Supabase's built-in provider
button) because we store the user's `repo` + `read:user` token server-side for
later milestones:

1. `GET /api/auth/github` → builds the authorize URL with a random `state`
   (httpOnly cookie) and 302-redirects to GitHub.
2. `GET /api/auth/callback` → validates `state`, exchanges the code for an
   access token, fetches the GitHub user, creates/looks up the Supabase auth
   user (service-role admin API), signs them in (session cookies via
   `@supabase/ssr`), upserts the profile + token, auto-creates the workspace
   once (slug = GitHub login), and redirects to `/dashboard`.

**GitHub OAuth App callback URL:** `<NEXT_PUBLIC_APP_URL>/api/auth/callback`.
Scopes requested: `repo read:user`.

The GitHub access token is stored in the **`github_tokens` table** (migration
0002), which has RLS enabled and **zero client policies** — the browser can
never read it. The dashboard reads it server-side via the service-role client.

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
- `supabase/migrations/0002_github_tokens.sql` — `profiles` gains
  `github_login`/`avatar_url`; new `github_tokens` table (service-role-only,
  zero client RLS policies) for the user's GitHub OAuth token.
- `supabase/seed.sql` — idempotent demo data: one workspace (`acme`), one
  connected repo, six changelog entries across all categories, one webhook event.

## Layout

```
src/
  app/                # routes: / (landing), /dashboard, /api/auth/*, /api/repos/toggle
  components/ui/      # shadcn/ui components
  lib/
    types.ts          # Profile, Workspace, ConnectedRepo, ChangelogEntry, WebhookEvent, GitHubRepo, …
    github.ts         # GitHub OAuth helpers + Octokit factory (server-only)
    supabase/         # client.ts (browser), server.ts (@supabase/ssr), admin.ts (service role)
    plans.ts          # free/pro tier limits
    mocks/            # GitHub pull_request.closed fixtures + sample entries
scripts/seed.ts       # seed runner (needs DATABASE_URL)
supabase/
  migrations/         # 0001_init.sql, 0002_github_tokens.sql
  seed.sql
.env.example          # every env var, documented
```

## Environment variables

See [`.env.example`](.env.example) — every variable has a one-line comment.
Public vars are `NEXT_PUBLIC_*`; everything else is server-only.