import { Octokit } from "@octokit/rest";
import type { GitHubApiUser, GitHubRepo, GitHubTokenResponse } from "@/lib/types";

/**
 * GitHub OAuth + API helpers for the custom sign-in flow and the
 * repository dashboard. All functions are server-side only (they touch
 * GITHUB_CLIENT_SECRET or a user's stored access token).
 */

export const GITHUB_OAUTH_SCOPES = "repo read:user";

export const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const GITHUB_API_BASE = "https://api.github.com";

const GITHUB_API_ACCEPT = "application/vnd.github+json";
const GITHUB_API_VERSION = "2022-11-28";
const USER_AGENT = "ChangelogSync";

/** Validated GitHub OAuth configuration, or a readable reason it's missing. */
export type OAuthConfig =
  | {
      ok: true;
      clientId: string;
      clientSecret: string;
      appUrl: string;
      redirectUri: string;
    }
  | { ok: false; message: string };

export function getOAuthConfig(): OAuthConfig {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !clientSecret || !appUrl) {
    return {
      ok: false,
      message:
        "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and NEXT_PUBLIC_APP_URL (see .env.example). The GitHub OAuth App callback URL must be <NEXT_PUBLIC_APP_URL>/api/auth/callback.",
    };
  }
  return {
    ok: true,
    clientId,
    clientSecret,
    appUrl,
    redirectUri: `${appUrl}/api/auth/callback`,
  };
}

/** Exchange the OAuth `code` for an access token (GitHub, JSON body). */
export async function exchangeCodeForToken(
  code: string,
  config: Extract<OAuthConfig, { ok: true }>,
): Promise<GitHubTokenResponse> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GitHub token exchange failed with HTTP ${res.status}`);
  }
  return (await res.json()) as GitHubTokenResponse;
}

/** Fetch the authenticated GitHub user (`GET /user`). */
export async function fetchGitHubUser(accessToken: string): Promise<GitHubApiUser> {
  const res = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: GITHUB_API_ACCEPT,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GitHub user fetch failed with HTTP ${res.status}`);
  }
  return (await res.json()) as GitHubApiUser;
}

/** Octokit instance authenticated as the stored GitHub user. */
export function createGitHubClient(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

/**
 * All repositories the user can connect (owned + collaborator), newest
 * activity first, paginated to completion.
 */
export async function fetchGitHubRepos(accessToken: string): Promise<GitHubRepo[]> {
  const octokit = createGitHubClient(accessToken);
  const repos = await octokit.paginate(
    octokit.rest.repos.listForAuthenticatedUser,
    { per_page: 100, sort: "pushed", affiliation: "owner,collaborator" },
  );
  return repos.map((repo) => ({
    id: repo.id,
    full_name: repo.full_name,
    private: repo.private,
    html_url: repo.html_url,
    description: repo.description,
    owner: { login: repo.owner.login },
    default_branch: repo.default_branch ?? "main",
  }));
}

/** Deterministic Supabase Auth email for a GitHub account (never emailed). */
export function githubEmail(githubId: number): string {
  return `github-${githubId}@users.changelogsync.local`;
}