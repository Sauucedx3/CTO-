/**
 * ChangelogSync — keyless file store.
 *
 * A tiny, dependency-free persistence layer over JSON files. No database, no
 * credentials, no network: everything the no-signup changelog needs is a
 * directory on disk that survives machine replacement (see `paths.ts`).
 *
 * Guarantees:
 *  - every function is async and typed; no `any` escapes the module
 *  - writes are ATOMIC (temp file in the same directory + `rename`) so a crash
 *    mid-write can never leave a half-written `workspaces.json`
 *  - writes are serialized through ONE in-process promise queue, so concurrent
 *    server-function calls cannot interleave read-modify-write cycles
 *  - reads never throw on a missing file (empty result) but DO throw on
 *    malformed JSON, so corruption is loud instead of silently empty
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { CATEGORIES, type Category } from "@/lib/types";

import {
  getDataDir,
  getEntriesDir,
  getEntriesFilePath,
  getWorkspacesFilePath,
} from "./paths";
import {
  type EntriesFile,
  type NewStoredEntry,
  type NewStoredWorkspace,
  type StoredEntry,
  type StoredEntryPatch,
  type StoredWorkspace,
  type StoredWorkspacePatch,
  StoreValidationError,
  WorkspaceNotFoundError,
  type WorkspacesFile,
} from "./types";

export {
  StoreValidationError,
  WorkspaceNotFoundError,
  type NewStoredEntry,
  type NewStoredWorkspace,
  type StoredEntry,
  type StoredEntryPatch,
  type StoredWorkspace,
  type StoredWorkspacePatch,
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------
// Writes: atomic + serialized
// ---------------------------------------------------------------------------

/** Module-level promise chain — every write in this process queues behind it. */
let writeQueue: Promise<unknown> = Promise.resolve();

/** Run `task` after all previously queued writes have settled. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  // Keep the chain alive even if this task rejects.
  writeQueue = run.catch(() => undefined);
  return run;
}

/**
 * Atomically replace `file` with `value` as pretty-printed JSON.
 *
 * The temp file lives in the SAME directory as the target (so `rename` is an
 * atomic same-filesystem operation) and the DIRECTORY is what gets created —
 * never a directory that happens to be named like the target file.
 */
async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  const dir = dirname(file);
  await mkdir(dir, { recursive: true });
  const tmp = join(dir, `.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(tmp, file);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    throw err;
  }
}

/** Read + parse a JSON file. `null` when the file does not exist. */
async function readJson<T>(file: string): Promise<T | null> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(
      `Corrupt JSON in ${file}: ${(err as Error).message}. Fix or delete the file.`
    );
  }
}

// ---------------------------------------------------------------------------
// Validation / normalization helpers
// ---------------------------------------------------------------------------

/** Lowercase, strip accents/punctuation, collapse to a URL-safe slug. */
export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  if (!slug) throw new StoreValidationError(`Cannot derive a slug from "${input}"`);
  return slug;
}

/** Validate (and return) a workspace slug. */
export function assertSlug(slug: string): string {
  if (typeof slug !== "string" || !SLUG_RE.test(slug) || slug.length > 64) {
    throw new StoreValidationError(
      `Invalid workspace slug "${slug}" — expected ${SLUG_RE}`
    );
  }
  return slug;
}

function assertCategory(category: unknown): Category {
  if (typeof category !== "string" || !CATEGORIES.includes(category as Category)) {
    throw new StoreValidationError(
      `Invalid category "${String(category)}" — expected one of ${CATEGORIES.join(", ")}`
    );
  }
  return category as Category;
}

function assertTitle(title: unknown): string {
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new StoreValidationError("Entry title is required");
  }
  const trimmed = title.trim();
  if (trimmed.length > 200) {
    throw new StoreValidationError("Entry title must be 200 characters or fewer");
  }
  return trimmed;
}

function normalizeTags(tags: unknown): string[] {
  if (tags == null) return [];
  if (!Array.isArray(tags)) throw new StoreValidationError("tags must be an array");
  const out: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== "string") throw new StoreValidationError("tags must be strings");
    const t = tag.trim().toLowerCase();
    if (t && !out.includes(t)) out.push(t);
  }
  return out.slice(0, 12);
}

function toIso(value: string | undefined, fallback: string): string {
  if (value == null) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new StoreValidationError(`Invalid date "${value}"`);
  }
  return parsed.toISOString();
}

function sortEntries(entries: StoredEntry[]): StoredEntry[] {
  return [...entries].sort((a, b) => {
    const delta = Date.parse(b.created_at) - Date.parse(a.created_at);
    return delta !== 0 ? delta : a.id.localeCompare(b.id);
  });
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

async function readWorkspacesFile(dataDir = getDataDir()): Promise<WorkspacesFile> {
  const file = await readJson<WorkspacesFile>(getWorkspacesFilePath(dataDir));
  if (!file || !Array.isArray(file.workspaces)) {
    return { version: 1, workspaces: [] };
  }
  return file;
}

async function writeWorkspacesFile(
  file: WorkspacesFile,
  dataDir = getDataDir()
): Promise<void> {
  // NOTE: always the workspaces.json FILE path — never a directory of that name.
  await writeJsonAtomic(getWorkspacesFilePath(dataDir), file);
}

/** All workspaces, oldest first. */
export async function listWorkspaces(dataDir = getDataDir()): Promise<StoredWorkspace[]> {
  const file = await readWorkspacesFile(dataDir);
  return [...file.workspaces].sort((a, b) =>
    a.created_at === b.created_at
      ? a.slug.localeCompare(b.slug)
      : Date.parse(a.created_at) - Date.parse(b.created_at)
  );
}

/** Look up one workspace by slug; `null` when it does not exist. */
export async function getWorkspaceBySlug(
  slug: string,
  dataDir = getDataDir()
): Promise<StoredWorkspace | null> {
  const wanted = assertSlug(slug);
  const file = await readWorkspacesFile(dataDir);
  return file.workspaces.find((w) => w.slug === wanted) ?? null;
}

/** Create a workspace (idempotent on slug: returns the existing row unchanged). */
export async function createWorkspace(
  input: NewStoredWorkspace,
  dataDir = getDataDir()
): Promise<StoredWorkspace> {
  const name = input.name?.trim();
  if (!name) throw new StoreValidationError("Workspace name is required");
  const slug = assertSlug(input.slug ? input.slug : slugify(name));

  return enqueue(async () => {
    const file = await readWorkspacesFile(dataDir);
    const existing = file.workspaces.find((w) => w.slug === slug);
    if (existing) return existing;

    const workspace: StoredWorkspace = {
      slug,
      name,
      brand_color: input.brand_color ?? null,
      created_at: toIso(input.created_at, new Date().toISOString()),
    };
    file.workspaces.push(workspace);
    await writeWorkspacesFile(file, dataDir);
    return workspace;
  });
}

/** Patch a workspace's display fields. Returns `null` when the slug is unknown. */
export async function updateWorkspace(
  slug: string,
  patch: StoredWorkspacePatch,
  dataDir = getDataDir()
): Promise<StoredWorkspace | null> {
  const wanted = assertSlug(slug);
  return enqueue(async () => {
    const file = await readWorkspacesFile(dataDir);
    const index = file.workspaces.findIndex((w) => w.slug === wanted);
    if (index === -1) return null;

    const current = file.workspaces[index];
    const next: StoredWorkspace = {
      ...current,
      name: patch.name?.trim() || current.name,
      brand_color:
        patch.brand_color === undefined ? current.brand_color : patch.brand_color,
    };
    file.workspaces[index] = next;
    await writeWorkspacesFile(file, dataDir);
    return next;
  });
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

async function readEntriesFile(
  slug: string,
  dataDir = getDataDir()
): Promise<EntriesFile> {
  const wanted = assertSlug(slug);
  const file = await readJson<EntriesFile>(getEntriesFilePath(wanted, dataDir));
  if (!file || !Array.isArray(file.entries)) {
    return { version: 1, slug: wanted, entries: [] };
  }
  return file;
}

async function writeEntriesFile(file: EntriesFile, dataDir = getDataDir()): Promise<void> {
  await writeJsonAtomic(getEntriesFilePath(file.slug, dataDir), file);
}

export interface ListEntriesOptions {
  /** Include drafts (`published: false`). Default `true` (store-level truth). */
  includeUnpublished?: boolean;
  /** Cap the number of returned entries (applied after sorting). */
  limit?: number;
}

/**
 * Entries for a workspace, newest first. A workspace with no file yet — or no
 * workspace at all — yields `[]` rather than throwing, which is what the public
 * `/c/[slug]` page wants for an unknown slug.
 */
export async function listEntries(
  slug: string,
  options: ListEntriesOptions = {},
  dataDir = getDataDir()
): Promise<StoredEntry[]> {
  const { includeUnpublished = true, limit } = options;
  const file = await readEntriesFile(slug, dataDir);
  let entries = sortEntries(file.entries);
  if (!includeUnpublished) entries = entries.filter((e) => e.published);
  if (typeof limit === "number" && limit >= 0) entries = entries.slice(0, limit);
  return entries;
}

/** Published entries only, newest first — the public timeline query. */
export async function listPublishedEntries(
  slug: string,
  limit?: number,
  dataDir = getDataDir()
): Promise<StoredEntry[]> {
  return listEntries(slug, { includeUnpublished: false, limit }, dataDir);
}

/** One entry by id, or `null`. */
export async function getEntry(
  slug: string,
  id: string,
  dataDir = getDataDir()
): Promise<StoredEntry | null> {
  const file = await readEntriesFile(slug, dataDir);
  return file.entries.find((e) => e.id === id) ?? null;
}

/** Create an entry. Throws `WorkspaceNotFoundError` when the slug is unknown. */
export async function createEntry(
  slug: string,
  input: NewStoredEntry,
  dataDir = getDataDir()
): Promise<StoredEntry> {
  const wanted = assertSlug(slug);
  const title = assertTitle(input.title);
  const category = assertCategory(input.category ?? "feature");
  const tags = normalizeTags(input.tags);
  const body = input.body?.trim() ?? "";

  return enqueue(async () => {
    const workspaces = await readWorkspacesFile(dataDir);
    if (!workspaces.workspaces.some((w) => w.slug === wanted)) {
      throw new WorkspaceNotFoundError(wanted);
    }

    const file = await readEntriesFile(wanted, dataDir);
    const now = new Date().toISOString();
    const id = input.id?.trim() || randomUUID();
    if (file.entries.some((e) => e.id === id)) {
      throw new StoreValidationError(`Entry id already exists: ${id}`);
    }

    const createdAt = toIso(input.created_at, now);
    const entry: StoredEntry = {
      id,
      title,
      body,
      category,
      tags,
      published: input.published ?? true,
      created_at: createdAt,
      updated_at: now,
    };
    file.entries.push(entry);
    await writeEntriesFile(file, dataDir);
    return entry;
  });
}

/**
 * Patch an entry. Returns `null` when the entry (or its workspace) is unknown.
 * `updated_at` is always refreshed.
 */
export async function updateEntry(
  slug: string,
  id: string,
  patch: StoredEntryPatch,
  dataDir = getDataDir()
): Promise<StoredEntry | null> {
  const wanted = assertSlug(slug);
  return enqueue(async () => {
    const file = await readEntriesFile(wanted, dataDir);
    const index = file.entries.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const current = file.entries[index];
    const next: StoredEntry = {
      ...current,
      title: patch.title === undefined ? current.title : assertTitle(patch.title),
      body: patch.body === undefined ? current.body : patch.body.trim(),
      category:
        patch.category === undefined ? current.category : assertCategory(patch.category),
      tags: patch.tags === undefined ? current.tags : normalizeTags(patch.tags),
      published: patch.published === undefined ? current.published : !!patch.published,
      created_at:
        patch.created_at === undefined
          ? current.created_at
          : toIso(patch.created_at, current.created_at),
      updated_at: new Date().toISOString(),
    };
    file.entries[index] = next;
    await writeEntriesFile(file, dataDir);
    return next;
  });
}

/** Delete an entry. `true` when something was removed. */
export async function deleteEntry(
  slug: string,
  id: string,
  dataDir = getDataDir()
): Promise<boolean> {
  const wanted = assertSlug(slug);
  return enqueue(async () => {
    const file = await readEntriesFile(wanted, dataDir);
    const next = file.entries.filter((e) => e.id !== id);
    if (next.length === file.entries.length) return false;
    await writeEntriesFile({ ...file, entries: next }, dataDir);
    return true;
  });
}

/** Count entries per category (drafts included) — handy for admin/summary UI. */
export async function countEntriesByCategory(
  slug: string,
  dataDir = getDataDir()
): Promise<Record<Category, number>> {
  const entries = await listEntries(slug, {}, dataDir);
  const counts = { feature: 0, fix: 0, improvement: 0 } as Record<Category, number>;
  for (const entry of entries) counts[entry.category] += 1;
  return counts;
}

/** Ensure the data dir exists (call once at startup or from the seed script). */
export async function ensureDataDir(dataDir = getDataDir()): Promise<string> {
  await mkdir(getEntriesDir(dataDir), { recursive: true });
  return dataDir;
}
