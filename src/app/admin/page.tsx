/**
 * `/admin` — token-gated changelog console (MVP 3).
 *
 * This SERVER component deliberately renders NO entry data: it only lists the
 * workspaces (already public at `/c/[slug]`) and mounts the client console,
 * which fetches entries through the token-gated admin API. Drafts therefore
 * never reach the browser until a valid admin token is presented — a
 * client-side-only gate over server-rendered HTML would have leaked them.
 *
 * The page is `force-dynamic` and `nodejs` because it reads the keyless file
 * store straight off disk on every request.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound, LockKeyhole } from "lucide-react";

import { AdminConsole } from "@/app/admin/admin-console";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_ORDER, categoryMeta } from "@/lib/changelog/categories";
import { StoreValidationError, listWorkspaces, type StoredWorkspace } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Admin",
  description: "Manage your ChangelogSync timeline.",
  robots: { index: false, follow: false },
};

/** Preferred default workspace when it exists. */
const DEFAULT_WORKSPACE = "acme";

async function readWorkspaces(): Promise<StoredWorkspace[]> {
  try {
    return await listWorkspaces();
  } catch (err) {
    // A corrupt store must surface on the public timeline too; here we let the
    // error boundary handle it rather than silently showing an empty selector.
    if (err instanceof StoreValidationError) return [];
    throw err;
  }
}

interface AdminPageProps {
  searchParams: Promise<{ workspace?: string }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { workspace } = await searchParams;
  const workspaces = await readWorkspaces();

  const requested = workspace?.trim();
  const initialWorkspace =
    workspaces.find((w) => w.slug === requested)?.slug ??
    workspaces.find((w) => w.slug === DEFAULT_WORKSPACE)?.slug ??
    workspaces[0]?.slug ??
    "";

  const categories = CATEGORY_ORDER.map((value) => categoryMeta(value));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-20 sm:px-6">
      <nav className="flex items-center justify-between py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          ChangelogSync
        </Link>
        <div className="flex items-center gap-3">
          {initialWorkspace ? (
            <Link
              href={`/c/${initialWorkspace}`}
              className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              View public page
            </Link>
          ) : null}
          <Badge variant="outline" className="gap-1">
            <LockKeyhole aria-hidden="true" className="h-3 w-3" />
            Token protected
          </Badge>
        </div>
      </nav>

      <header className="rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <KeyRound aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin console</h1>
            <p className="mt-2 max-w-xl text-sm text-pretty text-muted-foreground">
              Add, edit, publish and delete changelog entries. Your admin token is generated on the
              server at deploy time — paste it once per browser session and it is kept in this tab
              only.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-8">
        {workspaces.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No workspaces yet</p>
            <p className="mt-2">
              Create one from the command line, then reload this page:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              bun run seed
            </pre>
          </div>
        ) : (
          <AdminConsole
            workspaces={workspaces.map(({ slug, name, brand_color }) => ({
              slug,
              name,
              brand_color,
            }))}
            initialWorkspace={initialWorkspace}
            categories={categories}
          />
        )}
      </div>
    </main>
  );
}
