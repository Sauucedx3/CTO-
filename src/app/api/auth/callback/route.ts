import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  fetchGitHubUser,
  getOAuthConfig,
  githubEmail,
} from "@/lib/github";

const STATE_COOKIE = "gh_oauth_state";

/**
 * GitHub OAuth callback. Validates `state`, exchanges `code` for an
 * access token, fetches the GitHub user, creates the Supabase auth user
 * if absent (service-role admin API), signs them in (session cookies via
 * @supabase/ssr), upserts the profile row + GitHub token, auto-creates
 * the user's workspace once (slug = GitHub login), and redirects to
 * /dashboard. Errors redirect to /dashboard?auth_error=<code>.
 */
export async function GET(request: NextRequest) {
  const config = getOAuthConfig();
  if (!config.ok) {
    return NextResponse.json({ error: "config", message: config.message }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;

  const dashboardUrl = `${config.appUrl}/dashboard`;
  const fail = (key: string): NextResponse =>
    NextResponse.redirect(`${dashboardUrl}?auth_error=${key}`);

  // User denied the authorization request (GitHub appends `?error=...`).
  if (error) return fail("denied");

  // Validate state before trusting the code (CSRF protection).
  if (!code || !state || !savedState || state !== savedState) {
    return fail("invalid_state");
  }

  // Consume the one-time state cookie.
  cookieStore.set(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  try {
    const exchange = await exchangeCodeForToken(code, config);
    if (!exchange.access_token || exchange.error) {
      console.error("[auth/callback] token exchange failed", exchange.error ?? "no token");
      return fail("exchange_failed");
    }

    let ghUser;
    try {
      ghUser = await fetchGitHubUser(exchange.access_token);
    } catch (err) {
      console.error("[auth/callback] user fetch failed", err);
      return fail("exchange_failed");
    }

    const admin = createAdminClient();
    const email = githubEmail(ghUser.id);

    // Create the Supabase auth user if absent (idempotent — ignore the
    // "already exists" error for returning users). The signup trigger in
    // migration 0001 creates the `profiles` row.
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password: randomBytes(24).toString("hex"),
      email_confirm: true,
      user_metadata: {
        full_name: ghUser.name ?? ghUser.login,
        user_name: ghUser.login,
        avatar_url: ghUser.avatar_url,
        github_id: ghUser.id,
      },
    });
    if (createError && createError.code !== "user_already_exists") {
      console.error("[auth/callback] createUser failed", createError.message);
      return fail("signup_failed");
    }

    // Authoritative user id + one-time magic-link token for BOTH the
    // create and the returning-user paths (generateLink returns the user).
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError || !link?.user || !link.properties?.hashed_token) {
      console.error("[auth/callback] generateLink failed", linkError?.message);
      return fail("signup_failed");
    }
    const userId = link.user.id;

    // Upsert profile (display_name + GitHub identity for the header).
    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          display_name: ghUser.name ?? ghUser.login,
          github_login: ghUser.login,
          avatar_url: ghUser.avatar_url,
        },
        { onConflict: "id" },
      );
    if (profileError) {
      console.error("[auth/callback] profile upsert failed", profileError.message);
      return fail("signup_failed");
    }

    // Store the GitHub token server-side (service-role-only table).
    const { error: tokenError } = await admin
      .from("github_tokens")
      .upsert(
        {
          user_id: userId,
          github_id: ghUser.id,
          github_login: ghUser.login,
          access_token: exchange.access_token,
          scope: exchange.scope ?? null,
        },
        { onConflict: "user_id" },
      );
    if (tokenError) {
      console.error("[auth/callback] token upsert failed", tokenError.message);
      return fail("signup_failed");
    }

    // Auto-create the workspace ONCE (slug = GitHub login). The unique
    // owner index (migration 0001) makes this idempotent
    // (ignoreDuplicates = ON CONFLICT DO NOTHING).
    const { error: workspaceError } = await admin
      .from("workspaces")
      .upsert(
        {
          slug: ghUser.login,
          name: ghUser.name ?? ghUser.login,
          owner_id: userId,
        },
        { onConflict: "owner_id", ignoreDuplicates: true },
      );
    if (workspaceError) {
      console.error("[auth/callback] workspace insert failed", workspaceError.message);
      return fail("signup_failed");
    }

    // Sign the user in by exchanging the magic-link token for a session.
    // The @supabase/ssr cookie-aware client writes the session cookies.
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "magiclink",
    });
    if (verifyError) {
      console.error("[auth/callback] verifyOtp failed", verifyError.message);
      return fail("signin_failed");
    }

    return NextResponse.redirect(dashboardUrl);
  } catch (err) {
    console.error("[auth/callback] unexpected error", err);
    return NextResponse.json(
      { error: "server_error", message: "Unexpected error during GitHub sign-in." },
      { status: 500 },
    );
  }
}