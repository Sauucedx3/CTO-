/**
 * ChangelogSync — where the keyless file store lives on disk.
 *
 * The data dir MUST survive sandbox machine replacements, so it defaults to a
 * path under `/home` (`/home` persists; `/srv`, `/tmp` and the container
 * filesystem do not). Override with `CHANGELOGSYNC_DATA` for tests/CI.
 *
 * Layout:
 *   <dataDir>/workspaces.json          — every workspace
 *   <dataDir>/entries/<slug>.json      — entries for one workspace
 *   <dataDir>/admin.token              — deploy-time generated admin secret (chmod 600)
 */
import { homedir } from "node:os";
import { join, resolve } from "node:path";

/** Default data dir — under /home so it survives machine replacement. */
export const DEFAULT_DATA_DIR = "/home/team/shared/data/changelogsync";

/** Resolve the active data dir (env override wins, then the persistent default). */
export function getDataDir(): string {
  const override = process.env.CHANGELOGSYNC_DATA?.trim();
  if (override) return resolve(override.replace(/^~(?=\/|$)/, homedir()));
  return DEFAULT_DATA_DIR;
}

/** `<dataDir>/workspaces.json` — the workspaces FILE (never a directory of this name). */
export function getWorkspacesFilePath(dataDir = getDataDir()): string {
  return join(dataDir, "workspaces.json");
}

/** `<dataDir>/entries` — the directory holding one JSON file per workspace slug. */
export function getEntriesDir(dataDir = getDataDir()): string {
  return join(dataDir, "entries");
}

/** `<dataDir>/entries/<slug>.json`. */
export function getEntriesFilePath(slug: string, dataDir = getDataDir()): string {
  return join(getEntriesDir(dataDir), `${slug}.json`);
}

/** `<dataDir>/admin.token` — generated at deploy time, never supplied by the owner. */
export function getAdminTokenPath(dataDir = getDataDir()): string {
  return join(dataDir, "admin.token");
}
