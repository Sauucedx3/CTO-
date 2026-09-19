#!/usr/bin/env bun
/**
 * ChangelogSync keyless file store — smoke test.
 *
 *   bun run store:smoke        (or: bun scripts/store-smoke.ts)
 *
 * Runs the whole store against a throwaway data dir (never touches the real
 * `/home` dataset) and asserts the create → read → update → delete → re-read
 * cycle, atomic-write behaviour, the write queue under concurrency, the
 * "workspaces.json must be a FILE" regression, and admin-token generation.
 * Exits non-zero on the first failure.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ADMIN_COOKIE_NAME,
  adminTokenPath,
  createEntry,
  createWorkspace,
  deleteEntry,
  ensureAdminToken,
  getAdminToken,
  getEntriesFilePath,
  getWorkspaceBySlug,
  getWorkspacesFilePath,
  listEntries,
  listPublishedEntries,
  listWorkspaces,
  updateEntry,
  updateWorkspace,
  verifyAdminToken,
} from "@/lib/store";

const dataDir = await mkdtemp(join(tmpdir(), "changelogsync-smoke-"));
process.env.CHANGELOGSYNC_DATA = dataDir;

let checks = 0;
function ok(label: string, value: unknown) {
  assert.ok(value, label);
  checks += 1;
  console.log(`  ✓ ${label}`);
}
function eq<T>(label: string, actual: T, expected: T) {
  assert.deepEqual(actual, expected, label);
  checks += 1;
  console.log(`  ✓ ${label}`);
}

async function expectReject(label: string, fn: () => Promise<unknown>, match: RegExp) {
  let threw: unknown;
  try {
    await fn();
  } catch (err) {
    threw = err;
  }
  assert.ok(threw, `${label} — expected a rejection`);
  assert.match(String((threw as Error).message), match, label);
  checks += 1;
  console.log(`  ✓ ${label}`);
}

console.log(`store smoke test — data dir ${dataDir}`);

// --- workspaces -----------------------------------------------------------
console.log("workspaces:");
const acme = await createWorkspace({
  name: "Acme Analytics",
  brand_color: "#6366f1",
  created_at: "2026-06-01T09:00:00.000Z",
});
eq("createWorkspace derives slug from name", acme.slug, "acme-analytics");
eq("brand colour stored", acme.brand_color, "#6366f1");

const acmeAgain = await createWorkspace({ name: "Acme Analytics" });
eq("createWorkspace is idempotent on slug", acmeAgain.created_at, acme.created_at);

const demo = await createWorkspace({ slug: "demo", name: "Demo Product" });
eq("explicit slug preserved", demo.slug, "demo");
eq("brand colour defaults to null", demo.brand_color, null);

const all = await listWorkspaces();
eq("listWorkspaces returns both, oldest first", all.map((w) => w.slug), [
  "acme-analytics",
  "demo",
]);
eq("getWorkspaceBySlug finds one", (await getWorkspaceBySlug("demo"))?.name, "Demo Product");
eq("getWorkspaceBySlug returns null for unknown", await getWorkspaceBySlug("nope"), null);

await expectReject("invalid slug rejected", () => getWorkspaceBySlug("Bad Slug"), /Invalid workspace slug/);
await expectReject("blank name rejected", () => createWorkspace({ name: "   " }), /name is required/);

// --- regression: workspaces.json must be a FILE ---------------------------
console.log("layout:");
const workspacesPath = getWorkspacesFilePath(dataDir);
const workspacesStat = await stat(workspacesPath);
ok("workspaces.json exists and is a FILE, not a directory", workspacesStat.isFile());
const parsed = JSON.parse(await readFile(workspacesPath, "utf8")) as { workspaces: unknown[] };
eq("workspaces.json holds both workspaces", parsed.workspaces.length, 2);
// `entries/` appears on the first entry write (checked below).

// --- entries: create / list ordering --------------------------------------
console.log("entries:");
const e1 = await createEntry("acme-analytics", {
  title: "Saved views",
  body: "Body one",
  category: "feature",
  tags: ["Dashboards", "sharing", "dashboards"],
  created_at: "2026-09-12T15:30:00.000Z",
});
const e2 = await createEntry("acme-analytics", {
  title: "Timezone drift fix",
  category: "fix",
  published: true,
  created_at: "2026-09-08T11:05:00.000Z",
});
const e3 = await createEntry("acme-analytics", {
  title: "Faster funnels",
  body: "Body three",
  category: "improvement",
  published: false,
  created_at: "2026-08-29T08:20:00.000Z",
});

eq("tags normalised + de-duplicated", e1.tags, ["dashboards", "sharing"]);
const entriesStat = await stat(join(dataDir, "entries"));
ok("entries/ directory auto-created on first entry write", entriesStat.isDirectory());
ok(
  "entries file is per-workspace and not a directory",
  (await stat(getEntriesFilePath("acme-analytics", dataDir))).isFile()
);
eq("body defaults to empty string", e2.body, "");
eq("published defaults to true", e2.published, true);
ok("entry ids are unique", e1.id !== e2.id && new Set([e1.id, e2.id, e3.id]).size === 3);
ok("updated_at set on create", e1.updated_at.length > 0);
eq("created_at honours caller value", e1.created_at, "2026-09-12T15:30:00.000Z");

const listed = await listEntries("acme-analytics");
eq("listEntries is newest-first", listed.map((e) => e.title), [
  "Saved views",
  "Timezone drift fix",
  "Faster funnels",
]);
eq("listEntries includes drafts by default", listed.length, 3);
eq("listPublishedEntries hides drafts", (await listPublishedEntries("acme-analytics")).length, 2);
eq("listEntries honours limit", (await listEntries("acme-analytics", { limit: 1 })).length, 1);
eq("unknown workspace yields []", await listEntries("ghost-workspace"), []);

await expectReject(
  "createEntry on unknown workspace rejected",
  () => createEntry("ghost-workspace", { title: "x" }),
  /Workspace not found/
);
await expectReject("blank title rejected", () => createEntry("demo", { title: "  " }), /title is required/);
await expectReject(
  "unknown category rejected",
  () => createEntry("demo", { title: "x", category: "chore" as never }),
  /Invalid category/
);

// --- update ---------------------------------------------------------------
console.log("update:");
const updated = await updateEntry("acme-analytics", e3.id, {
  title: "Faster funnels (v2)",
  published: true,
  tags: ["performance"],
});
ok("updateEntry returns the patched entry", updated?.title === "Faster funnels (v2)");
eq("patched category untouched", updated?.category, "improvement");
eq("patched tags replaced", updated?.tags, ["performance"]);
eq("published flipped", updated?.published, true);
ok(
  "updated_at refreshed on update",
  updated !== null && Date.parse(updated.updated_at) >= Date.parse(e3.updated_at)
);
eq("missing entry returns null", await updateEntry("acme-analytics", "does-not-exist", { title: "x" }), null);

const renamedWorkspace = await updateWorkspace("demo", { name: "Demo Product 2" });
eq("updateWorkspace patches name", renamedWorkspace?.name, "Demo Product 2");
eq("updateWorkspace on unknown slug returns null", await updateWorkspace("ghost-workspace", { name: "x" }), null);

// --- write queue under concurrency ---------------------------------------
console.log("concurrency:");
await Promise.all(
  Array.from({ length: 12 }, (_, i) =>
    createEntry("demo", {
      title: `Concurrent entry ${i}`,
      created_at: `2026-07-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    })
  )
);
const concurrent = await listEntries("demo");
eq("all 12 concurrent writes persisted", concurrent.length, 12);
for (let i = 0; i < 12; i += 1) {
  ok(`concurrent entry ${i} readable`, concurrent.some((e) => e.title === `Concurrent entry ${i}`));
  checks -= 1; // keep the log readable: one aggregate assertion is enough
}
ok("concurrent writes did not corrupt JSON", JSON.parse(await readFile(getEntriesFilePath("demo", dataDir), "utf8")).entries.length === 12);

// --- delete + re-read ----------------------------------------------------
console.log("delete:");
eq("deleteEntry removes one", await deleteEntry("acme-analytics", e2.id), true);
eq("deleteEntry on missing id returns false", await deleteEntry("acme-analytics", e2.id), false);
const afterDelete = await listEntries("acme-analytics");
eq("entry gone after re-read", afterDelete.map((e) => e.title), [
  "Saved views",
  "Faster funnels (v2)",
]);
const reopened = JSON.parse(await readFile(getEntriesFilePath("acme-analytics", dataDir), "utf8")) as {
  slug: string;
  entries: unknown[];
};
eq("entries file records its slug", reopened.slug, "acme-analytics");
eq("entries file on disk matches memory", reopened.entries.length, 2);

// --- admin token ---------------------------------------------------------
console.log("admin token:");
eq("cookie name", ADMIN_COOKIE_NAME, "admin_token");
const token = await ensureAdminToken();
ok("token is >= 32 bytes of hex", token.length >= 64 && /^[0-9a-f]+$/.test(token));
eq("ensureAdminToken is stable across calls", await ensureAdminToken(), token);
eq("getAdminToken reads the persisted value", await getAdminToken(), token);
const tokenStat = await stat(adminTokenPath());
eq("admin.token mode is 600", (tokenStat.mode & 0o777).toString(8), "600");
ok("verifyAdminToken accepts the real token", await verifyAdminToken(token));
ok("verifyAdminToken rejects a wrong token", !(await verifyAdminToken("deadbeef")));
ok("verifyAdminToken rejects empty", !(await verifyAdminToken("")));

// --- cleanup -------------------------------------------------------------
await rm(dataDir, { recursive: true, force: true });
console.log(`\nALL CHECKS PASSED (${checks} assertions) — smoke test clean.`);
