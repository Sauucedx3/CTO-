-- ChangelogSync — milestone 2: GitHub OAuth onboarding + repository dashboard
-- Run via `supabase db push` or the Supabase SQL editor. Idempotent.

-- ============================================================
-- profiles: GitHub identity fields for the dashboard header and
-- for locating an existing account when a user signs back in
-- (deterministic lookup by GitHub login, server-side only).
-- ============================================================
alter table public.profiles
  add column if not exists github_login text,
  add column if not exists avatar_url text;

create index if not exists profiles_github_login_idx on public.profiles (github_login);

-- ============================================================
-- github_tokens — GitHub OAuth access tokens, server-side ONLY.
--
-- DESIGN CHOICE (documented per the milestone brief):
-- A separate service-role-only table (mirroring `webhook_events` from
-- 0001) instead of a `github_access_token` column on `profiles`.
-- Rationale: `profiles` has an owner SELECT policy
-- (`auth.uid() = id`) that would hand a token column straight to the
-- browser on any `select *`. A dedicated table with RLS enabled and
-- ZERO client policies is deny-by-default for anon/authenticated
-- roles, while the service role (used by our server API routes)
-- bypasses RLS. This makes accidental client-side token leakage
-- structurally impossible instead of relying on policy discipline.
-- ============================================================
create table if not exists public.github_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  github_id bigint not null,
  github_login text not null,
  access_token text not null,
  scope text,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.github_tokens enable row level security;
-- No policies are created on purpose: RLS denies by default.
-- `service_role` bypasses RLS and is the only role with table grants.

revoke all on table public.github_tokens from anon, authenticated;
grant select, insert, update, delete on table public.github_tokens to service_role;