import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FREE_PLAN_MAX_REPOS } from "@/lib/plans";

/** Request body from the dashboard switch. */
interface ToggleRepoBody {
  github_repo_id: number;
  full_name: string;
  enabled: boolean;
}

/**
 * Enable/disable changelog generation for a connected repository.
 *
 * - Authenticated via the user's session (server client).
 * - Free tier: at most FREE_PLAN_MAX_REPOS enabled repos per workspace.
 *   Enforcing here (server-side) keeps the gate honest even if the UI is
 *   bypassed. Only `profiles.plan` is consulted — Stripe wiring is a
 *   later milestone.
 * - Upserts `connected_repos` (idempotent per workspace+repo); turning a
 *   repo OFF keeps the row (webhook_enabled = false).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json(
      { error: "unauthenticated", message: "Sign in to manage repositories." },
      { status: 401 },
    );
  }

  let body: ToggleRepoBody;
  try {
    const json = (await request.json()) as Record<string, unknown>;
    // Values are validated immediately below — these assertions only give
    // the parsed JSON a shape to validate against.
    body = {
      github_repo_id: json.github_repo_id as number,
      full_name: json.full_name as string,
      enabled: json.enabled as boolean,
    };
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Invalid request body." },
      { status: 400 },
    );
  }

  if (
    !Number.isInteger(body.github_repo_id) ||
    typeof body.full_name !== "string" ||
    !body.full_name.includes("/") ||
    typeof body.enabled !== "boolean"
  ) {
    return NextResponse.json(
      { error: "invalid_body", message: "Invalid repository payload." },
      { status: 400 },
    );
  }
  const owner = body.full_name.split("/")[0]!;

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json(
      { error: "profile_missing", message: "Your account isn't fully set up." },
      { status: 500 },
    );
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!workspace) {
    return NextResponse.json(
      { error: "workspace_missing", message: "No workspace found for your account." },
      { status: 500 },
    );
  }

  // --- Free-tier gate (server-side, plan field only) ---
  if (body.enabled) {
    const { data: enabledRows } = await supabase
      .from("connected_repos")
      .select("github_repo_id")
      .eq("workspace_id", workspace.id)
      .eq("webhook_enabled", true);

    const toggleCount = enabledRows?.length ?? 0;
    const alreadyEnabled = enabledRows?.some(
      (row) => row.github_repo_id === body.github_repo_id,
    );
    if (
      profile.plan === "free" &&
      toggleCount >= FREE_PLAN_MAX_REPOS &&
      !alreadyEnabled
    ) {
      return NextResponse.json(
        {
          error: "plan_limit",
          message: `Your free plan supports ${FREE_PLAN_MAX_REPOS} connected repository at a time. Disable one or upgrade to Pro for unlimited repositories.`,
        },
        { status: 403 },
      );
    }
  }

  const { data: repo, error: upsertError } = await supabase
    .from("connected_repos")
    .upsert(
      {
        workspace_id: workspace.id,
        github_repo_id: body.github_repo_id,
        full_name: body.full_name,
        owner,
        webhook_enabled: body.enabled,
      },
      { onConflict: "workspace_id,github_repo_id" },
    )
    .select("id, workspace_id, github_repo_id, full_name, owner, webhook_enabled")
    .single();

  if (upsertError || !repo) {
    console.error("[repos/toggle] upsert failed", upsertError?.message);
    return NextResponse.json(
      { error: "db", message: "Couldn't save the repository setting." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, repo });
}