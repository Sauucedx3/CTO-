import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getOAuthConfig, GITHUB_AUTHORIZE_URL, GITHUB_OAUTH_SCOPES } from "@/lib/github";

/**
 * Start the custom GitHub OAuth flow (NOT Supabase's built-in provider
 * button) because we need the `repo` + `read:user` scopes stored
 * server-side for the webhook/API milestones.
 *
 * Stores a random `state` in an httpOnly cookie (10 min) and 302-redirects
 * to GitHub's authorize URL. The callback URL is
 * `<NEXT_PUBLIC_APP_URL>/api/auth/callback`.
 */
export async function GET() {
  const config = getOAuthConfig();
  if (!config.ok) {
    // Readable error instead of a crash when env vars are missing/dummies.
    return NextResponse.json({ error: "config", message: config.message }, { status: 500 });
  }

  const state = randomBytes(24).toString("hex");
  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: GITHUB_OAUTH_SCOPES,
    redirect_uri: config.redirectUri,
    state,
    allow_signup: "true",
  });

  const response = NextResponse.redirect(`${GITHUB_AUTHORIZE_URL}?${params.toString()}`);
  response.cookies.set("gh_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}