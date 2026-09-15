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
  /** GitHub login (set by the GitHub OAuth callback; used to find the account on re-login). */
  github_login: string | null;
  /** GitHub avatar URL (set by the GitHub OAuth callback). */
  avatar_url: string | null;
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

// ---------------------------------------------------------------------------
// GitHub API types
// ---------------------------------------------------------------------------

/**
 * A GitHub repository as surfaced to the dashboard. Mirrors the fields of the
 * `GET /user/repos` REST response that ChangelogSync actually uses (see
 * `src/lib/github.ts`), so call sites never touch raw Octokit generics.
 */
export interface GitHubRepo {
  id: number;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  owner: { login: string };
  default_branch: string;
}

/** `github_tokens` table — server-only storage of GitHub OAuth tokens. */
export interface GitHubToken {
  user_id: string;
  github_id: number;
  github_login: string;
  access_token: string;
  scope: string | null;
  fetched_at: string;
  updated_at: string;
}

/** The authenticated GitHub user from `GET /user` (OAuth callback). */
export interface GitHubApiUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

/** Response shape of GitHub's OAuth token endpoint (application/json). */
export interface GitHubTokenResponse {
  access_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}