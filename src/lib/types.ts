/**
 * ChangelogSync — shared domain types.
 *
 * These mirror the Postgres schema in `supabase/migrations/0001_init.sql`
 * (column-for-column), so they can be passed straight to/from Supabase.
 * Keep this file and the migrations in sync when the schema changes.
 */

// ---------------------------------------------------------------------------
// Enums (mirror the Postgres enum types `public.plan` / `public.entry_category`)
// ---------------------------------------------------------------------------

/** Subscription tier: free (1 repo, 10 entries/mo) or pro (unlimited). */
export type Plan = "free" | "pro";

/** AI-assigned changelog category. */
export type Category = "feature" | "fix" | "improvement";

/** The three changelog categories, for iteration/validation. */
export const CATEGORIES: readonly Category[] = ["feature", "fix", "improvement"];

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

/** `profiles` table — one row per auth user. */
export interface Profile {
  id: string;
  display_name: string | null;
  plan: Plan;
  stripe_customer_id: string | null;
  created_at: string;
}

/** `workspaces` table — MVP: one per owner; slug is the public /c/[slug] path. */
export interface Workspace {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  custom_cname: string | null;
  brand_color: string | null;
  created_at: string;
}

/** `connected_repos` table — a GitHub repo linked to a workspace. */
export interface ConnectedRepo {
  id: string;
  workspace_id: string;
  github_repo_id: number;
  full_name: string;
  owner: string | null;
  webhook_enabled: boolean;
  created_at: string;
}

/** `changelog_entries` table — one row per merged PR. */
export interface ChangelogEntry {
  id: string;
  workspace_id: string;
  repo_id: string | null;
  github_pr_number: number | null;
  pr_title: string | null;
  pr_description: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  labels: string[];
  merged_at: string | null;
  category: Category | null;
  summary_markdown: string | null;
  published: boolean;
  created_at: string;
}

/** `webhook_events` table — idempotency/audit log of GitHub deliveries. */
export interface WebhookEvent {
  id: string;
  github_delivery_id: string | null;
  event_type: string | null;
  repo_full_name: string | null;
  payload: Record<string, unknown> | null;
  processed_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Row aliases (use where call sites want to signal "raw DB row")
// ---------------------------------------------------------------------------

export type ProfileRow = Profile;
export type WorkspaceRow = Workspace;
export type ConnectedRepoRow = ConnectedRepo;
export type ChangelogEntryRow = ChangelogEntry;
export type WebhookEventRow = WebhookEvent;

// ---------------------------------------------------------------------------
// Insert/update payloads (Omits of the row types)
// ---------------------------------------------------------------------------

/** Columns a client may set when creating a profile. */
export type NewProfile = Pick<Profile, "id"> &
  Partial<Pick<Profile, "display_name" | "plan" | "stripe_customer_id">>;

/** Columns a client may set when creating a workspace. */
export type NewWorkspace = Pick<Workspace, "slug" | "name" | "owner_id"> &
  Partial<Pick<Workspace, "custom_cname" | "brand_color">>;

/** Columns a client may set when connecting a repo. */
export type NewConnectedRepo = Pick<
  ConnectedRepo,
  "workspace_id" | "github_repo_id" | "full_name"
> &
  Partial<Pick<ConnectedRepo, "owner" | "webhook_enabled">>;

/** Columns a client may set when creating a changelog entry. */
export type NewChangelogEntry = Pick<ChangelogEntry, "workspace_id" | "pr_title"> &
  Partial<
    Omit<
      ChangelogEntry,
      "id" | "workspace_id" | "pr_title" | "created_at"
    >
  >;