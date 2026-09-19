/**
 * ChangelogSync keyless file store — public entry point.
 *
 *   import { listPublishedEntries, ensureAdminToken } from "@/lib/store";
 *
 * This module (and everything it re-exports) touches ONLY `node:fs` and
 * `node:crypto`. It never imports a Supabase client, an env secret, or any
 * network SDK, so it keeps working on a sandbox with zero credentials.
 */
export * from "./types";
export * from "./paths";
export * from "./admin";
export {
  assertSlug,
  countEntriesByCategory,
  createEntry,
  createWorkspace,
  deleteEntry,
  ensureDataDir,
  getEntry,
  getWorkspaceBySlug,
  listEntries,
  listPublishedEntries,
  listWorkspaces,
  slugify,
  updateEntry,
  updateWorkspace,
  type ListEntriesOptions,
} from "./file-store";
