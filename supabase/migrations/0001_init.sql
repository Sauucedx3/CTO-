-- ChangelogSync — initial schema (milestone 1)
-- Applies cleanly on a fresh Supabase project. Idempotent where it matters;
-- run via `supabase db push` or the Supabase SQL editor.

-- ============================================================
-- Extensions & enums
-- ============================================================
create extension if not exists pgcrypto;

-- Subscription plan for a profile: free | pro
do $$ begin
  create type public.plan as enum ('free', 'pro');
exception when duplicate_object then null; end $$;

-- Changelog entry category used by the AI-summary pipeline
do $$ begin
  create type public.entry_category as enum ('feature', 'fix', 'improvement');
exception when duplicate_object then null; end $$;

-- ============================================================
-- profiles
-- One row per auth user (auto-created by the signup trigger below).
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  plan public.plan not null default 'free',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- workspaces
-- MVP: exactly one workspace per owner (see unique index at the bottom).
-- slug is the public URL segment of the /c/[slug] changelog page.
-- ============================================================
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  custom_cname text,
  brand_color text default '#6366f1',
  created_at timestamptz not null default now()
);

-- ============================================================
-- connected_repos
-- A GitHub repository connected to a workspace (webhook toggle lives here).
-- ============================================================
create table if not exists public.connected_repos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  github_repo_id bigint not null,
  full_name text not null,
  owner text,
  webhook_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, github_repo_id)
);

-- ============================================================
-- changelog_entries
-- One row per merged PR; summary_markdown is the AI-written note.
-- ============================================================
create table if not exists public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  repo_id uuid references public.connected_repos (id) on delete cascade,
  github_pr_number integer,
  pr_title text,
  pr_description text,
  author_username text,
  author_avatar_url text,
  labels text[] not null default '{}',
  merged_at timestamptz,
  category public.entry_category,
  summary_markdown text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- webhook_events
-- Idempotency/audit log of every GitHub webhook delivery.
-- Written by the server (service role) only; no client RLS policies.
-- ============================================================
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  github_delivery_id text unique,
  event_type text not null,
  repo_full_name text,
  payload jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);
create index if not exists connected_repos_workspace_id_idx on public.connected_repos (workspace_id);
create index if not exists changelog_entries_workspace_id_created_at_idx
  on public.changelog_entries (workspace_id, created_at desc);
create index if not exists changelog_entries_repo_id_idx on public.changelog_entries (repo_id);
create index if not exists webhook_events_delivery_id_idx on public.webhook_events (github_delivery_id);

-- MVP: one workspace per owner.
create unique index if not exists workspaces_one_per_owner_idx
  on public.workspaces (owner_id);

-- ============================================================
-- Row Level Security — enabled on EVERY table
-- ============================================================
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.connected_repos enable row level security;
alter table public.changelog_entries enable row level security;
alter table public.webhook_events enable row level security;

-- ---------- profiles (own row only) ----------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- ---------- workspaces (owner CRUD + public read by slug) ----------
drop policy if exists "workspaces_select_own" on public.workspaces;
create policy "workspaces_select_own" on public.workspaces
  for select using (auth.uid() = owner_id);

-- Public changelog page (/c/[slug]) must be readable by everyone.
drop policy if exists "workspaces_select_public" on public.workspaces;
create policy "workspaces_select_public" on public.workspaces
  for select to anon, authenticated using (true);

drop policy if exists "workspaces_insert_own" on public.workspaces;
create policy "workspaces_insert_own" on public.workspaces
  for insert with check (auth.uid() = owner_id);

drop policy if exists "workspaces_update_own" on public.workspaces;
create policy "workspaces_update_own" on public.workspaces
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "workspaces_delete_own" on public.workspaces;
create policy "workspaces_delete_own" on public.workspaces
  for delete using (auth.uid() = owner_id);

-- ---------- connected_repos (owner via workspace join) ----------
drop policy if exists "connected_repos_select_own" on public.connected_repos;
create policy "connected_repos_select_own" on public.connected_repos
  for select using (
    exists (
      select 1 from public.workspaces w
      where w.id = connected_repos.workspace_id and w.owner_id = auth.uid()
    )
  );

drop policy if exists "connected_repos_insert_own" on public.connected_repos;
create policy "connected_repos_insert_own" on public.connected_repos
  for insert with check (
    exists (
      select 1 from public.workspaces w
      where w.id = connected_repos.workspace_id and w.owner_id = auth.uid()
    )
  );

drop policy if exists "connected_repos_update_own" on public.connected_repos;
create policy "connected_repos_update_own" on public.connected_repos
  for update using (
    exists (
      select 1 from public.workspaces w
      where w.id = connected_repos.workspace_id and w.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.workspaces w
      where w.id = connected_repos.workspace_id and w.owner_id = auth.uid()
    )
  );

drop policy if exists "connected_repos_delete_own" on public.connected_repos;
create policy "connected_repos_delete_own" on public.connected_repos
  for delete using (
    exists (
      select 1 from public.workspaces w
      where w.id = connected_repos.workspace_id and w.owner_id = auth.uid()
    )
  );

-- ---------- changelog_entries (owner CRUD + public read of published) ----------
drop policy if exists "changelog_entries_select_own" on public.changelog_entries;
create policy "changelog_entries_select_own" on public.changelog_entries
  for select using (
    exists (
      select 1 from public.workspaces w
      where w.id = changelog_entries.workspace_id and w.owner_id = auth.uid()
    )
  );

drop policy if exists "changelog_entries_select_published" on public.changelog_entries;
create policy "changelog_entries_select_published" on public.changelog_entries
  for select to anon, authenticated using (published = true);

drop policy if exists "changelog_entries_insert_own" on public.changelog_entries;
create policy "changelog_entries_insert_own" on public.changelog_entries
  for insert with check (
    exists (
      select 1 from public.workspaces w
      where w.id = changelog_entries.workspace_id and w.owner_id = auth.uid()
    )
  );

drop policy if exists "changelog_entries_update_own" on public.changelog_entries;
create policy "changelog_entries_update_own" on public.changelog_entries
  for update using (
    exists (
      select 1 from public.workspaces w
      where w.id = changelog_entries.workspace_id and w.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.workspaces w
      where w.id = changelog_entries.workspace_id and w.owner_id = auth.uid()
    )
  );

drop policy if exists "changelog_entries_delete_own" on public.changelog_entries;
create policy "changelog_entries_delete_own" on public.changelog_entries
  for delete using (
    exists (
      select 1 from public.workspaces w
      where w.id = changelog_entries.workspace_id and w.owner_id = auth.uid()
    )
  );

-- ---------- webhook_events (service-role only: no client policies) ----------
-- The webhook listener writes via SUPABASE_SERVICE_ROLE_KEY, which bypasses
-- RLS. Keep this table locked to the client API entirely.

-- ============================================================
-- Auto-create a profile row on user signup (Supabase Auth trigger)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'user_name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Grants (Supabase requires explicit role grants when creating via SQL)
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;

grant select on table public.profiles to anon, authenticated;
grant insert, update, delete on table public.profiles to authenticated;

grant select on table public.workspaces to anon, authenticated;
grant insert, update, delete on table public.workspaces to authenticated;

grant select, insert, update, delete on table public.connected_repos to authenticated;

grant select on table public.changelog_entries to anon, authenticated;
grant insert, update, delete on table public.changelog_entries to authenticated;

grant select, insert, update, delete on table public.webhook_events to service_role;

grant all on all tables in schema public to service_role;