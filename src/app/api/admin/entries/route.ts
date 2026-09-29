/**
 * Admin entries collection — `/api/admin/entries`
 *
 *   GET    /api/admin/entries?workspace=acme
 *          → { workspace, entries, counts }  (DRAFTS INCLUDED — token required)
 *   POST   /api/admin/entries
 *          body { workspace, title, body?, category?, tags?, published? }
 *          → 201 { entry }
 *
 * Auth: `x-admin-token: <token from admin.token>`. Wrong/missing → 401.
 * All writes go through the keyless file store, which serializes them in one
 * write queue and writes atomically — never touch the JSON files directly.
 */
import { NextResponse } from "next/server";

import {
  badRequest,
  isAdminRequest,
  readJsonBody,
  readWorkspaceParam,
  storeErrorResponse,
  unauthorized,
} from "@/lib/admin/guard";
import {
  countEntriesByCategory,
  createEntry,
  getWorkspaceBySlug,
  listEntries,
} from "@/lib/store";

import { entryInputFromBody } from "./shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();

  const workspaceSlug = readWorkspaceParam(request);
  if (!workspaceSlug) {
    return badRequest("A `workspace` query parameter is required.");
  }

  try {
    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return NextResponse.json(
        { error: "workspace_not_found", message: `Unknown workspace "${workspaceSlug}".` },
        { status: 404 }
      );
    }
    const [entries, counts] = await Promise.all([
      listEntries(workspace.slug, { includeUnpublished: true }),
      countEntriesByCategory(workspace.slug),
    ]);
    return NextResponse.json({
      workspace,
      entries,
      counts,
      drafts: entries.filter((entry) => !entry.published).length,
    });
  } catch (err) {
    return storeErrorResponse(err, "GET /api/admin/entries");
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return badRequest(parsed.message);

  const slug = readWorkspaceParam(request, parsed.body);
  if (!slug) return badRequest("`workspace` is required.");

  const input = entryInputFromBody(parsed.body);
  if (!input.ok) return badRequest(input.message);

  try {
    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) {
      return NextResponse.json(
        { error: "workspace_not_found", message: `Unknown workspace "${slug}".` },
        { status: 404 }
      );
    }
    const entry = await createEntry(workspace.slug, input.value);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return storeErrorResponse(err, "POST /api/admin/entries");
  }
}
