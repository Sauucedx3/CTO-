import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchGitHubRepos } from "@/lib/github";
import { authErrorMessage } from "@/lib/auth-errors";
import { SignInCard } from "./sign-in-card";
import { RepoDashboard } from "./repo-dashboard";
import type { ConnectedRepo, GitHubRepo, Profile, Workspace } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * /dashboard — GitHub OAuth onboarding + repository toggles.
 *
 * Server component: reads the session, loads the user's profile/workspace/
 * connected repos through the user-scoped client, then loads their GitHub
 * repositories through the service-role client (which can read the token
 * in `github_tokens` — never exposed to the browser). Renders the client
 * `<RepoDashboard>` for interactivity.
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const sp = await searchParams;
  const authError = typeof sp.auth_error === "string" ? sp.auth_error : null;
  const authErrorMsg = authErrorMessage(authError);

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error("[dashboard] supabase env missing", err);
    return (
      <SignInCard
        authErrorMsg="ChangelogSync isn't connected to its database yet — please try again later."
        disabled
      />
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <SignInCard authErrorMsg={authErrorMsg} />;
  }

  // User-scoped reads (RLS: own profile, own workspace, own repos).
  const { data: profile } = (await supabase
    .from("profiles")
    .select("id, display_name, github_login, avatar_url, plan")
    .eq("id", user.id)
    .maybeSingle()) as unknown as {
    data: Pick<
      Profile,
      "display_name" | "github_login" | "avatar_url" | "plan"
    > | null;
  };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle() as unknown as { data: Workspace | null };

  let connectedRepos: ConnectedRepo[] = [];
  if (workspace) {
    const { data } = await supabase
      .from("connected_repos")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: true }) as unknown as {
      data: ConnectedRepo[] | null;
    };
    connectedRepos = data ?? [];
  }

  // GitHub repos via the stored token (service-role read of github_tokens).
  let githubRepos: GitHubRepo[] = [];
  let githubError: string | null = null;
  try {
    const admin = createAdminClient();
    const { data: token } = await admin
      .from("github_tokens")
      .select("access_token")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!token?.access_token) {
      githubError =
        "GitHub isn't connected for this account. Sign in with GitHub again to re-link it.";
    } else {
      githubRepos = await fetchGitHubRepos(token.access_token);
    }
  } catch (err) {
    console.error("[dashboard] github repos fetch failed", err);
    githubError =
      "Couldn't load your GitHub repositories. Please try again in a moment.";
  }

  return (
    <RepoDashboard
      displayName={profile?.display_name ?? user.user_metadata?.full_name ?? null}
      githubLogin={profile?.github_login ?? null}
      avatarUrl={profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null}
      plan={profile?.plan ?? "free"}
      workspace={workspace ?? null}
      connectedRepos={connectedRepos}
      githubRepos={githubRepos}
      githubError={githubError}
      authErrorMsg={authErrorMsg}
    />
  );
}