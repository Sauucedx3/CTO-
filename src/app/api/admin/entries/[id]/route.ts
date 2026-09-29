/**
 * Admin entry by id — `/api/admin/entries/<id>`
 *
 *   PATCH  /api/admin/entries/<id>?workspace=acme
 *          body { title?, body?, category?, tags?, published? }   → { entry }
 *   DELETE /api/admin/entries/<id>?workspace=acme                 → { deleted: true, id }
 *
 * Auth: `x-admin-token: <token from admin.token>` on every verb. Wrong → 401.
 * Mutations go through the file store's serialized atomic writes.
 */
import { NextResponse } from "next/server";

import {
  badRequest,
  isAdminRequest,
  notFound,
  readJsonBody,
  readWorkspaceParam,
  storeErrorResponse,
  unauthorized,
} from "@/lib/admin/guard";
import { deleteEntry, getWorkspaceBySlug, updateEntry } from "@/lib/store";

import { entryPatchFromBody } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EntryRouteContext {
  params: Promise<{ id: string }>;
}

/** Resolve workspace + id, or return the response to send back. */
async function resolveTarget(request: Request, context: EntryRouteContext) {
  const { id } = await context.params;
  const entryId = id?.trim();
  if (!entryId) {
    return { error: badRequest("An entry id is required in the path.") };
  }

  const workspaceSlug = readWorkspaceParam(request);
  if (!workspaceSlug) {
    return { error: badRequest("A `workspace` query parameter is required.") };
  }

  try {
    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return {
        error: notFound("workspace_not_found", `Unknown workspace "${workspaceSlug}".`),
      };
    }
    return { workspace, entryId };
  } catch (err) {
    return { error: storeErrorResponse(err, "admin entry lookup") };
  }
}

export async function PATCH(request: Request, context: EntryRouteContext) {
  if (!(await isAdminRequest(request))) return unauthorized();

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return badRequest(parsed.message);

  const target = await resolveTarget(request, context);
  if ("error" in target) return target.error;

  const patch = entryPatchFromBody(parsed.body);
  if (!patch.ok) return badRequest(patch.message);

  try {
    const entry = await updateEntry(target.workspace.slug, target.entryId, patch.value);
    if (!entry) {
      return notFound("entry_not_found", `No entry with id "${target.entryId}".`);
    }
    return NextResponse.json({ entry });
  } catch (err) {
    return storeErrorResponse(err, "PATCH /api/admin/entries/[id]");
  }
}

export async function DELETE(request: Request, context: EntryRouteContext) {
  if (!(await isAdminRequest(request))) return unauthorized();

  const target = await resolveTarget(request, context);
  if ("error" in target) return target.error;

  try {
    const deleted = await deleteEntry(target.workspace.slug, target.entryId);
    if (!deleted) {
      return notFound("entry_not_found", `No entry with id "${target.entryId}".`);
    }
    return NextResponse.json({ deleted: true, id: target.entryId });
  } catch (err) {
    return storeErrorResponse(err, "DELETE /api/admin/entries/[id]");
  }
}
