#!/usr/bin/env bun
/**
 * ChangelogSync seed runner — TWO modes.
 *
 * 1. KEYLESS (default, no env vars): seeds the file store under the persistent
 *    data dir (`/home/team/shared/data/changelogsync`, or `CHANGELOGSYNC_DATA`).
 *    Creates the demo workspaces `acme` and `demo` plus their changelog entries.
 *
 *      bun run seed
 *
 * 2. POSTGRES (legacy M2 path, only when DATABASE_URL is set): applies
 *    `supabase/seed.sql` to that database.
 *
 *      DATABASE_URL=postgresql://... bun run seed
 *
 * Flags: `--reset` wipes the seeded workspaces' entries first (file mode only).
 */
import { rm } from "node:fs/promises";

import {
  createEntry,
  createWorkspace,
  ensureDataDir,
  getDataDir,
  getEntriesFilePath,
  listEntries,
  type Category,
} from "@/lib/store";

interface SeedEntry {
  id: string;
  title: string;
  body: string;
  category: Category;
  tags: string[];
  published: boolean;
  created_at: string;
}

interface SeedWorkspace {
  slug: string;
  name: string;
  brand_color: string | null;
  created_at: string;
  entries: SeedEntry[];
}

const AC = "11111111-1111-4111-8111-";
const DE = "22222222-2222-4222-8222-";

/** Demo fixtures: two workspaces, mixed categories, spread over recent weeks. */
const SEED: SeedWorkspace[] = [
  {
    slug: "acme",
    name: "Acme Analytics",
    brand_color: "#6366f1",
    created_at: "2026-06-01T09:00:00.000Z",
    entries: [
      {
        id: `${AC}000000000001`,
        title: "Saved views for every dashboard",
        body: "You can now save any dashboard configuration as a named view.\n\n- Save, rename and share views with your team\n- Set a default view per dashboard\n- Views remember filters, date range and grouping",
        category: "feature",
        tags: ["dashboards", "sharing"],
        published: true,
        created_at: "2026-09-12T15:30:00.000Z",
      },
      {
        id: `${AC}000000000002`,
        title: "Fix timezone drift in scheduled reports",
        body: "Scheduled reports sent from a workspace in a non-UTC timezone were dated one day early. Reports now use the workspace timezone end to end.",
        category: "fix",
        tags: ["reports", "timezones"],
        published: true,
        created_at: "2026-09-08T11:05:00.000Z",
      },
      {
        id: `${AC}000000000003`,
        title: "Faster funnel queries",
        body: "Funnel queries now push their filters down to the storage layer, cutting p95 latency by roughly 45% on large workspaces.",
        category: "improvement",
        tags: ["performance"],
        published: true,
        created_at: "2026-08-29T08:20:00.000Z",
      },
      {
        id: `${AC}000000000004`,
        title: "Slack alerts for metric thresholds",
        body: "Connect Slack and get a message whenever a metric crosses a threshold you define.\n\nPer-alert cooldowns keep noisy metrics from spamming the channel.",
        category: "feature",
        tags: ["alerts", "integrations"],
        published: true,
        created_at: "2026-08-21T17:45:00.000Z",
      },
      {
        id: `${AC}000000000005`,
        title: "CSV export no longer truncates at 10k rows",
        body: "Large exports were silently cut off at 10,000 rows. Exports are now streamed and can contain every row in the result set.",
        category: "fix",
        tags: ["export"],
        published: true,
        created_at: "2026-08-14T13:10:00.000Z",
      },
      {
        id: `${AC}000000000006`,
        title: "Redesigned onboarding checklist",
        body: "A shorter, skippable onboarding checklist gets new workspaces to their first dashboard in under five minutes.",
        category: "improvement",
        tags: ["onboarding"],
        published: false,
        created_at: "2026-09-14T10:00:00.000Z",
      },
    ],
  },
  {
    slug: "demo",
    name: "Demo Product",
    brand_color: "#0ea5e9",
    created_at: "2026-07-15T09:00:00.000Z",
    entries: [
      {
        id: `${DE}000000000001`,
        title: "Introducing keyboard shortcuts",
        body: "Press `?` anywhere to see the new shortcut palette. The first batch covers navigation, search and creating items.",
        category: "feature",
        tags: ["ux"],
        published: true,
        created_at: "2026-09-13T09:15:00.000Z",
      },
      {
        id: `${DE}000000000002`,
        title: "Search results now rank exact matches first",
        body: "Titles that match your query exactly appear above fuzzy matches, so short queries stop burying the thing you wanted.",
        category: "improvement",
        tags: ["search"],
        published: true,
        created_at: "2026-09-07T16:40:00.000Z",
      },
      {
        id: `${DE}000000000003`,
        title: "Fix duplicate email notifications",
        body: "Commenting on an item could send the same notification twice. Notifications are now de-duplicated per recipient and event.",
        category: "fix",
        tags: ["notifications"],
        published: true,
        created_at: "2026-08-30T12:00:00.000Z",
      },
      {
        id: `${DE}000000000004`,
        title: "Public API read endpoints",
        body: "Read-only REST endpoints for items and comments are live, with cursor pagination.",
        category: "feature",
        tags: ["api", "developers"],
        published: true,
        created_at: "2026-08-25T14:25:00.000Z",
      },
      {
        id: `${DE}000000000005`,
        title: "Dark mode contrast fixes",
        body: "Several muted-text tokens failed WCAG AA in dark mode. All text now meets 4.5:1 contrast.",
        category: "fix",
        tags: ["accessibility", "ui"],
        published: true,
        created_at: "2026-08-18T10:35:00.000Z",
      },
      {
        id: `${DE}000000000006`,
        title: "Trimmed dashboard payload by 30%",
        body: "The dashboard no longer ships unused workspace metadata on first load.",
        category: "improvement",
        tags: ["performance"],
        published: true,
        created_at: "2026-08-11T07:55:00.000Z",
      },
    ],
  },
];

async function seedPostgres() {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { Client } = await import("pg");

  const sql = await readFile(join(process.cwd(), "supabase", "seed.sql"), "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Seed applied successfully to Postgres.");
  } finally {
    await client.end();
  }
}

async function seedFileStore(reset: boolean) {
  const dataDir = await ensureDataDir();
  console.log(`Seeding keyless file store in ${dataDir}`);

  for (const workspace of SEED) {
    if (reset) {
      await rm(getEntriesFilePath(workspace.slug, dataDir), { force: true });
    }

    await createWorkspace(
      {
        slug: workspace.slug,
        name: workspace.name,
        brand_color: workspace.brand_color,
        created_at: workspace.created_at,
      },
      dataDir
    );

    const existing = new Set((await listEntries(workspace.slug, {}, dataDir)).map((e) => e.id));
    let created = 0;
    for (const entry of workspace.entries) {
      if (existing.has(entry.id)) continue;
      await createEntry(workspace.slug, entry, dataDir);
      created += 1;
    }
    const total = (await listEntries(workspace.slug, {}, dataDir)).length;
    console.log(
      `  /c/${workspace.slug} — ${workspace.name}: ${created} new, ${total} total entries`
    );
  }
}

async function main() {
  const reset = process.argv.includes("--reset");
  if (process.env.DATABASE_URL) {
    await seedPostgres();
    return;
  }
  await seedFileStore(reset);
  console.log("Done. No credentials were required.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
