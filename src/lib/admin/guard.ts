/**
 * ChangelogSync — admin request guard.
 *
 * The admin surface is token-protected, and the ONLY door is the
 * `x-admin-token` request header (a bearer `Authorization: Bearer <token>` is
 * also accepted for curl convenience). The candidate is compared against
 * `<dataDir>/admin.token` with a constant-time comparison — see
 * `verifyAdminToken` in `src/lib/store/admin.ts`.
 *
 * There is no session, no cookie, no OAuth, no database: the token is the whole
 * auth system, which is exactly what the keyless MVP can afford. Keep this
 * module free of anything but `node:*`-backed store helpers so it stays usable
 * on a sandbox with zero credentials.
 */
import { NextResponse } from "next/server";

import {
  StoreValidationError,
  WorkspaceNotFoundError,
  verifyAdminToken,
} from "@/lib/store";

/** Header the admin client sends the token in. */
export const ADMIN_TOKEN_HEADER = "x-admin-token";

/**
 * True when the request carries a valid admin token.
 * Missing/empty/incorrect tokens are all `false` — never throws.
 */
export async function isAdminRequest(request: Request): Promise<boolean> {
  const header = request.headers.get(ADMIN_TOKEN_HEADER)?.trim();
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const candidate = header || bearer || "";
  if (!candidate) return false;
  return verifyAdminToken(candidate);
}

/** 401 — wrong, missing, or rotated admin token. */
export function unauthorized(): NextResponse {
  return NextResponse.json(
    {
      error: "unauthorized",
      message: "A valid admin token is required (x-admin-token header).",
    },
    { status: 401 }
  );
}

/** 400 — the request body/query failed validation. */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: "invalid_input", message }, { status: 400 });
}

/** 404 — unknown workspace or entry id. */
export function notFound(error: string, message: string): NextResponse {
  return NextResponse.json({ error, message }, { status: 404 });
}

/**
 * Map a thrown store error onto the right HTTP response.
 * Store validation → 400, unknown workspace → 404, anything else → 500.
 * `context` is logged so a corrupt store shows up in the server log.
 */
export function storeErrorResponse(err: unknown, context: string): NextResponse {
  if (err instanceof StoreValidationError) return badRequest(err.message);
  if (err instanceof WorkspaceNotFoundError) {
    return notFound("workspace_not_found", err.message);
  }
  console.error(`${context} failed:`, err);
  return NextResponse.json({ error: "store_unavailable" }, { status: 500 });
}

/**
 * Parse a JSON request body into a plain object.
 * Returns an error string instead of throwing so handlers stay flat.
 */
export async function readJsonBody(
  request: Request
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; message: string }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, message: "Request body must be valid JSON." };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }
  return { ok: true, body: raw as Record<string, unknown> };
}

/** Read a required `workspace` slug from the query string, falling back to body. */
export function readWorkspaceParam(
  request: Request,
  body?: Record<string, unknown>
): string | null {
  const fromQuery = new URL(request.url).searchParams.get("workspace");
  const candidate = fromQuery ?? (typeof body?.workspace === "string" ? body.workspace : null);
  const trimmed = candidate?.trim();
  return trimmed ? trimmed : null;
}
