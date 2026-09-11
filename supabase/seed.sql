-- ChangelogSync — seed data (milestone 1)
-- One workspace, one connected repo, six changelog entries spanning all
-- categories and dates, plus one sample webhook event.
-- Idempotent: safe to run more than once (ON CONFLICT DO NOTHING).
-- Apply via `bun run seed` (with DATABASE_URL set) or the Supabase SQL editor.

-- Fixed UUIDs so re-runs are stable.
insert into public.profiles (id, display_name, plan, stripe_customer_id, created_at)
values (
  '00000000-0000-0000-0000-000000000001',
  'Ada Lovelace',
  'pro',
  'cus_QxAcmeDemo123',
  now() - interval '6 months'
)
on conflict (id) do nothing;

insert into public.workspaces (id, slug, name, owner_id, custom_cname, brand_color, created_at)
values (
  '10000000-0000-0000-0000-000000000001',
  'acme',
  'Acme Inc.',
  '00000000-0000-0000-0000-000000000001',
  null,
  '#6366f1',
  now() - interval '6 months'
)
on conflict (id) do nothing;

insert into public.connected_repos (id, workspace_id, github_repo_id, full_name, owner, webhook_enabled, created_at)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  482910238,
  'acme-inc/acme-webapp',
  'acme-inc',
  true,
  now() - interval '5 months'
)
on conflict (id) do nothing;

insert into public.changelog_entries (
  id, workspace_id, repo_id, github_pr_number, pr_title, pr_description,
  author_username, author_avatar_url, labels, merged_at, category,
  summary_markdown, published, created_at
)
values
(
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  142,
  'Add dark mode with system preference detection',
  'Adds a theme toggle, persists the choice in localStorage, and respects prefers-color-scheme on first visit.',
  'adalovelace',
  'https://avatars.githubusercontent.com/u/12345?v=4',
  array['feature', 'ui'],
  now() - interval '2 days',
  'feature',
  E'### Dark mode\n\n- Theme toggle in the top bar\n- Picks up the system preference on first visit\n- Choice is remembered across sessions',
  true,
  now() - interval '2 days'
),
(
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  141,
  'Fix flash of unstyled content on dashboard load',
  'The dashboard shell rendered before the CSS bundle finished loading, causing a visible flash. Moved the critical styles into a blocking link tag.',
  'ababbage',
  'https://avatars.githubusercontent.com/u/54321?v=4',
  array['bug', 'perf'],
  now() - interval '5 days',
  'fix',
  E'Fixed a flash of unstyled content (FOUC) on dashboard load by inlining critical CSS.',
  true,
  now() - interval '5 days'
),
(
  '30000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  140,
  'Speed up search with server-side filtering',
  'Moves search filtering from the browser to the API, cutting result latency by ~60% on large workspaces.',
  'gboole',
  'https://avatars.githubusercontent.com/u/24680?v=4',
  array['improvement', 'search'],
  now() - interval '9 days',
  'improvement',
  E'Search is now filtered server-side, cutting result latency by about 60% on large workspaces.',
  true,
  now() - interval '9 days'
),
(
  '30000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  138,
  'Export changelog as Markdown',
  'Adds an Export button that downloads the current changelog as a single Markdown file for use in docs or release posts.',
  'ahertz',
  'https://avatars.githubusercontent.com/u/13579?v=4',
  array['feature', 'api'],
  now() - interval '16 days',
  'feature',
  E'### Export as Markdown\n\n- New **Export** button on the changelog page\n- Downloads the full changelog as one Markdown file, ready for docs or release posts',
  true,
  now() - interval '16 days'
),
(
  '30000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  135,
  'Fix duplicate entries when webhook retries',
  'Webhook retries from GitHub could create duplicate changelog entries. Idempotency keyed on the delivery id now prevents this.',
  'kzuse',
  'https://avatars.githubusercontent.com/u/97531?v=4',
  array['bug', 'webhooks'],
  now() - interval '24 days',
  'fix',
  E'Fixed duplicate changelog entries caused by GitHub webhook retries — processing is now idempotent per delivery.',
  true,
  now() - interval '24 days'
),
(
  '30000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  133,
  'Reduce bundle size with route-level code splitting',
  'Vendor chunks are now split per route, cutting the initial bundle by 32%.',
  'ghopper',
  'https://avatars.githubusercontent.com/u/86420?v=4',
  array['improvement', 'perf'],
  now() - interval '33 days',
  'improvement',
  E'Route-level code splitting shrinks the initial bundle by 32% — faster first paint.',
  true,
  now() - interval '33 days'
)
on conflict (id) do nothing;

-- One audited webhook delivery (idempotency log).
insert into public.webhook_events (id, github_delivery_id, event_type, repo_full_name, payload, processed_at, created_at)
values (
  '40000000-0000-0000-0000-000000000001',
  '9f8e7d6c-5b4a-4d3c-2b1a-098765432109',
  'pull_request.closed',
  'acme-inc/acme-webapp',
  jsonb_build_object('action', 'closed', 'number', 142, 'merged', true, 'sender', jsonb_build_object('login', 'adalovelace')),
  now() - interval '2 days',
  now() - interval '2 days'
)
on conflict (id) do nothing;