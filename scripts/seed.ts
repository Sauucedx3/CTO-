#!/usr/bin/env bun
/**
 * ChangelogSync seed runner.
 *
 * Applies `supabase/seed.sql` to any Postgres database reachable via the
 * `DATABASE_URL` env var (e.g. the Supabase pooler connection string).
 *
 *   DATABASE_URL=postgresql://... bun run seed
 *
 * Without DATABASE_URL it prints instructions and exits 0, so it is safe to
 * run in environments with no database (like this one during build).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";

const SEED_PATH = join(process.cwd(), "supabase", "seed.sql");

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log(
      "DATABASE_URL is not set — skipping seed.\n" +
        "To seed a real database: DATABASE_URL=postgresql://... bun run seed\n" +
        "or paste supabase/seed.sql into the Supabase SQL editor."
    );
    process.exit(0);
  }

  const sql = await readFile(SEED_PATH, "utf8");
  const client = new Client({ connectionString });

  await client.connect();
  try {
    await client.query(sql);
    console.log("Seed applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});