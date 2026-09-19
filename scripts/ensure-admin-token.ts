#!/usr/bin/env bun
/**
 * Deploy-time admin token provisioning.
 *
 *   bun run admin:token
 *
 * Generates `<dataDir>/admin.token` (32 random bytes → 64 hex chars, chmod 600)
 * if it does not exist, and prints the path + fingerprint only — never the
 * secret itself, so it is safe to paste this output into a report or log.
 *
 * The admin page will accept this value as the `admin_token` cookie.
 */
import { createHash } from "node:crypto";

import { adminTokenPath, ensureAdminToken, getDataDir } from "@/lib/store";

const token = await ensureAdminToken();
const fingerprint = createHash("sha256").update(token).digest("hex").slice(0, 12);

console.log("Admin token ready (no credentials required).");
console.log(`  data dir    : ${getDataDir()}`);
console.log(`  token file  : ${adminTokenPath()}`);
console.log(`  token length: ${token.length} hex chars`);
console.log(`  sha256[:12] : ${fingerprint}`);
console.log("  Read it with: cat " + adminTokenPath());
