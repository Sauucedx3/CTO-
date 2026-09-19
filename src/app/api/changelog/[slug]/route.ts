/**
 * GET /api/changelog/[slug]
 *
 * Runtime proof + first consumer of the keyless file store: returns a
 * workspace and its PUBLISHED entries as JSON. It reads straight off disk
 * (no database, no credentials) and is the shape the public `/c/[slug]`
 * timeline in the next milestone will render.
 *
 *   /api/changelog/acme           → workspace + all published entries
 *   /api/changelog/acme?limit=2   → same, capped at 2 entries
 *   /api/changelog/nope           → 404 { error: "workspace_not_found" }
 */
import { NextResponse } from "next/server";

import {
  getWorkspaceBySlug,
  listPublishedEntries,
  StoreValidationError,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  const rawLimit = new URL(request.url).searchParams.get("limit");
  let limit: number | undefined;
  if (rawLimit !== null) {
    const parsed = Number.parseInt(rawLimit, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return NextResponse.json({ error: "invalid_limit" }, { status: 400 });
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

  try {
    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) {
      return NextResponse.json({ error: "workspace_not_found" }, { status: 404 });
    }
    const entries = await listPublishedEntries(workspace.slug, limit);
    return NextResponse.json({ workspace, entries, count: entries.length });
  } catch (err) {
    if (err instanceof StoreValidationError) {
      return NextResponse.json({ error: "invalid_slug", message: err.message }, { status: 400 });
    }
    // A corrupt store must be visible, not silently 200-with-nothing.
    console.error(`GET /api/changelog/${slug} failed:`, err);
    return NextResponse.json({ error: "store_unavailable" }, { status: 500 });
  }
}
