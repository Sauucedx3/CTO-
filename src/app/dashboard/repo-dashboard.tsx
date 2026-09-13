"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Globe,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  TriangleAlert,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/github-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { FREE_PLAN_MAX_REPOS } from "@/lib/plans";
import type { ConnectedRepo, GitHubRepo, Plan, Workspace } from "@/lib/types";

type RepoDashboardProps = {
  displayName: string | null;
  githubLogin: string | null;
  avatarUrl: string | null;
  plan: Plan;
  workspace: Workspace | null;
  connectedRepos: ConnectedRepo[];
  githubRepos: GitHubRepo[];
  githubError: string | null;
  authErrorMsg: string | null;
};

type ToggleResponse =
  | { ok: true; repo: ConnectedRepo }
  | { ok?: false; error?: string; message?: string };

const AVATAR_FALLBACK = "https://avatars.githubusercontent.com/u/0?v=4";

export function RepoDashboard({
  displayName,
  githubLogin,
  avatarUrl,
  plan,
  workspace,
  connectedRepos,
  githubRepos,
  githubError,
  authErrorMsg,
}: RepoDashboardProps) {
  const [enabledMap, setEnabledMap] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {};
    for (const repo of connectedRepos) {
      if (repo.webhook_enabled) map[repo.github_repo_id] = true;
    }
    return map;
  });
  const [busyId, setBusyId] = useState<number | null>(null);

  const enabledCount = githubRepos.filter((repo) => enabledMap[repo.id]).length;

  async function handleToggle(repo: GitHubRepo, enabled: boolean) {
    setBusyId(repo.id);
    try {
      const res = await fetch("/api/repos/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_repo_id: repo.id,
          full_name: repo.full_name,
          enabled,
        }),
      });
      const data = (await res.json()) as ToggleResponse;
      if (!res.ok || data.ok !== true) {
        const message =
          typeof data === "object" && data && "message" in data && data.message
            ? data.message
            : "Couldn't update the repository.";
        toast.error(message);
        return; // optimistic state not applied — switch snaps back
      }
      setEnabledMap((prev) => ({ ...prev, [repo.id]: enabled }));
      toast.success(
        enabled
          ? `Changelog generation enabled for ${repo.full_name}.`
          : `Changelog generation disabled for ${repo.full_name}.`,
      );
    } catch {
      toast.error("Network error — couldn't update the repository.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Toaster richColors position="top-center" />
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl ?? AVATAR_FALLBACK}
              alt=""
              className="size-9 shrink-0 rounded-full ring-1 ring-border"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {displayName ?? "GitHub user"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {githubLogin ? `@${githubLogin}` : "GitHub account"}
              </p>
            </div>
            <Badge variant="outline">{plan === "pro" ? "Pro" : "Free"}</Badge>
          </div>
          <form action="/api/auth/signout" method="post">
            <Button type="submit" variant="outline" size="sm">
              <LogOut />
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {authErrorMsg && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{authErrorMsg}</span>
          </div>
        )}

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="size-5 text-primary" />
            Connected repositories
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn on changelog generation for any repository you can access.
            Merged pull requests in enabled repositories become changelog
            entries automatically.
          </p>
        </div>

        {/* Tier banner */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            {plan === "pro" ? (
              <>
                <span className="font-medium text-foreground">Pro plan</span> —
                unlimited connected repositories.
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">Free plan</span> —{" "}
                {enabledCount} of {FREE_PLAN_MAX_REPOS} repository
                {FREE_PLAN_MAX_REPOS === 1 ? "" : "s"} enabled at a time.
              </>
            )}
          </p>
          {plan === "free" && enabledCount >= FREE_PLAN_MAX_REPOS && (
            <span className="text-xs text-muted-foreground">
              Upgrade to Pro for unlimited repositories.
            </span>
          )}
        </div>

        {/* GitHub load error */}
        {githubError ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TriangleAlert className="size-4 text-destructive" />
                Can&apos;t load your repositories
              </CardTitle>
              <CardDescription>{githubError}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/api/auth/github">
                  <GithubIcon className="size-3.5" />
                  Reconnect GitHub
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">
                  <RefreshCw />
                  Retry
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : !workspace ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workspace missing</CardTitle>
              <CardDescription>
                Your workspace wasn&apos;t created. Sign out and sign in again to
                set it up.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : githubRepos.length === 0 ? (
          <Card className="py-10 text-center">
            <CardContent className="flex flex-col items-center gap-4">
              <Search className="size-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No repositories found</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  We couldn&apos;t find any repositories for this GitHub account.
                  Create one, or grant this app access to your repos via
                  GitHub.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  <RefreshCw />
                  Refresh
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {githubRepos.map((repo) => {
              const checked = enabledMap[repo.id] ?? false;
              const busy = busyId === repo.id;
              return (
                <li
                  key={repo.id}
                  className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <GithubIcon className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {repo.full_name}
                        </a>
                        <Badge
                          variant="secondary"
                          className="gap-1 text-[0.65rem]"
                        >
                          {repo.private ? (
                            <Lock className="size-3" />
                          ) : (
                            <Globe className="size-3" />
                          )}
                          {repo.private ? "Private" : "Public"}
                        </Badge>
                      </div>
                      {repo.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {repo.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {busy && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      checked={checked}
                      onCheckedChange={(next) => void handleToggle(repo, next)}
                      disabled={busyId !== null}
                      aria-label={`Toggle changelog generation for ${repo.full_name}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Tip: set <code className="text-foreground">NEXT_PUBLIC_APP_URL</code>{" "}
          and register the GitHub OAuth App callback as{" "}
          <code className="text-foreground">/api/auth/callback</code>.
        </p>
      </main>
    </div>
  );
}