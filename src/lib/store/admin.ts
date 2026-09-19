/**
 * ChangelogSync — admin token (keyless auth).
 *
 * The admin surface is protected by a single random secret generated AT DEPLOY
 * TIME into the persistent data dir. Nothing is asked of the owner and no
 * third-party key is involved: `ensureAdminToken()` creates
 * `<dataDir>/admin.token` (32 random bytes, hex, mode 600) on first call and
 * every later call returns the same value, because it lives on disk under
 * `/home`.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { getAdminTokenPath, getDataDir } from "./paths";

/** Cookie that carries the admin token once an admin signs in. */
export const ADMIN_COOKIE_NAME = "admin_token";

/** Length of the generated token in bytes (hex output is twice this). */
export const ADMIN_TOKEN_BYTES = 32;

/** Read the admin token, or `null` when it has not been generated yet. */
export async function getAdminToken(dataDir = getDataDir()): Promise<string | null> {
  try {
    const raw = (await readFile(getAdminTokenPath(dataDir), "utf8")).trim();
    return raw.length > 0 ? raw : null;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Return the existing admin token, generating + persisting one if absent.
 * Safe to call on every deploy / server start.
 */
export async function ensureAdminToken(dataDir = getDataDir()): Promise<string> {
  const existing = await getAdminToken(dataDir);
  if (existing) {
    // Re-assert 600 in case the file was restored with looser permissions.
    await chmod(getAdminTokenPath(dataDir), 0o600).catch(() => undefined);
    return existing;
  }

  const token = randomBytes(ADMIN_TOKEN_BYTES).toString("hex");
  const path = getAdminTokenPath(dataDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${token}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(path, 0o600);
  return token;
}

/** Path of the token file for the active data dir (useful in logs/reports). */
export function adminTokenPath(dataDir = getDataDir()): string {
  return getAdminTokenPath(dataDir);
}

/**
 * Constant-time comparison of a candidate token against `expected`. When
 * `expected` is omitted the on-disk token is used. Returns false for
 * empty/missing values instead of throwing.
 */
export async function verifyAdminToken(
  candidate: string | null | undefined,
  expected?: string,
  dataDir = getDataDir()
): Promise<boolean> {
  if (!candidate) return false;
  const secret = expected ?? (await getAdminToken(dataDir));
  if (!secret) return false;

  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
