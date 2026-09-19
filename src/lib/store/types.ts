/**
 * ChangelogSync — keyless file-store domain types.
 *
 * These are the *stored* shapes: the subset of the Postgres rows in
 * `src/lib/types.ts` that the no-signup changelog actually needs. They are
 * deliberately free of DB-only / GitHub-only columns (`workspace_id`,
 * `owner_id`, `repo_id`, `github_pr_number`, …) so the file store never has to
 * invent values it cannot compute without credentials.
 *
 * Naming note: the entry markdown body is stored as `body` (in Postgres this
 * column is `summary_markdown` — same content, shorter name for the file store).
 */
import { CATEGORIES, type Category } from "@/lib/types";

export { CATEGORIES };
export type { Category };

/** A changelog workspace — one per customer; `slug` is the public /c/[slug] path. */
export interface StoredWorkspace {
  /** URL-safe identifier, `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Primary key of the store. */
  slug: string;
  /** Human-readable product name shown on the public timeline. */
  name: string;
  /** Hex colour (e.g. `#6366f1`) used for branding; null = default theme. */
  brand_color: string | null;
  created_at: string;
}

/** A single published-or-draft changelog entry. */
export interface StoredEntry {
  id: string;
  title: string;
  /** Markdown body (the Postgres `summary_markdown` column). */
  body: string;
  category: Category;
  tags: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

/** Input accepted by `createWorkspace`. `slug` may be omitted → derived from `name`. */
export interface NewStoredWorkspace {
  slug?: string;
  name: string;
  brand_color?: string | null;
  created_at?: string;
}

/** Input accepted by `createEntry`. */
export interface NewStoredEntry {
  id?: string;
  title: string;
  body?: string;
  category?: Category;
  tags?: string[];
  published?: boolean;
  created_at?: string;
}

/** Patch accepted by `updateEntry` / `updateWorkspace`. */
export type StoredEntryPatch = Partial<
  Pick<StoredEntry, "title" | "body" | "category" | "tags" | "published" | "created_at">
>;

export type StoredWorkspacePatch = Partial<
  Pick<StoredWorkspace, "name" | "brand_color">
>;

/** Shape of `workspaces.json`. */
export interface WorkspacesFile {
  version: 1;
  workspaces: StoredWorkspace[];
}

/** Shape of `entries/<slug>.json`. */
export interface EntriesFile {
  version: 1;
  slug: string;
  entries: StoredEntry[];
}

/** Thrown for invalid input (bad slug, unknown category, missing title, …). */
export class StoreValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreValidationError";
  }
}

/** Thrown when a workspace slug does not exist. */
export class WorkspaceNotFoundError extends Error {
  constructor(slug: string) {
    super(`Workspace not found: ${slug}`);
    this.name = "WorkspaceNotFoundError";
  }
}
