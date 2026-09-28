import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { ChangelogTimeline } from "@/components/changelog/changelog-timeline";
import { TimelineSkeleton } from "@/components/changelog/timeline-skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_BRAND_COLOR,
  initialOf,
  normalizeBrandColor,
  readableTextColor,
  withAlpha,
} from "@/lib/changelog/format";
import {
  StoreValidationError,
  getWorkspaceBySlug,
  listPublishedEntries,
  type StoredWorkspace,
} from "@/lib/store";

/** Always re-read the file store on every request — no build-time snapshot. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface WorkspacePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Read a workspace without turning a *bad slug* into a 500.
 * `StoreValidationError` means the URL is not a valid slug → treat as missing.
 * Anything else (e.g. a corrupt store) propagates to `error.tsx` on purpose.
 */
async function readWorkspace(slug: string): Promise<StoredWorkspace | null> {
  try {
    return await getWorkspaceBySlug(slug);
  } catch (error) {
    if (error instanceof StoreValidationError) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: WorkspacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await readWorkspace(slug);
  if (!workspace) return { title: "Changelog not found" };

  const description = `Product updates, new features and fixes from ${workspace.name}.`;
  return {
    title: `${workspace.name} changelog`,
    description,
    openGraph: {
      title: `${workspace.name} — What's new`,
      description,
      type: "website",
    },
  };
}

/** Entries are read from the file store inside a Suspense boundary so the
 * workspace check above can still answer 404 for an unknown slug. */
async function TimelineSection({
  slug,
  brandColor,
  workspaceName,
}: {
  slug: string;
  brandColor: string;
  workspaceName: string;
}) {
  const entries = await listPublishedEntries(slug);

  return (
    <ChangelogTimeline
      entries={entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        body: entry.body,
        category: entry.category,
        tags: entry.tags,
        created_at: entry.created_at,
      }))}
      brandColor={brandColor}
      workspaceName={workspaceName}
    />
  );
}

export default async function WorkspaceChangelogPage({
  params,
}: WorkspacePageProps) {
  const { slug } = await params;
  const workspace = await readWorkspace(slug);
  if (!workspace) notFound();

  const brandColor = normalizeBrandColor(workspace.brand_color);
  const brandText = readableTextColor(brandColor);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-20 sm:px-6">
      <nav className="py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          ChangelogSync
        </Link>
      </nav>

      <header
        className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
        style={{
          borderColor: withAlpha(brandColor, 0.35),
          backgroundImage: `linear-gradient(135deg, ${withAlpha(brandColor, 0.16)} 0%, ${withAlpha(brandColor, 0)} 62%)`,
        }}
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-semibold shadow-sm"
            style={{ backgroundColor: brandColor, color: brandText }}
          >
            {initialOf(workspace.name)}
          </span>
          <div className="min-w-0">
            <Badge
              variant="outline"
              className="border-transparent"
              style={{ backgroundColor: withAlpha(brandColor, 0.14) }}
            >
              <Sparkles aria-hidden="true" className="h-3 w-3" />
              What&apos;s new
            </Badge>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {workspace.name}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-pretty text-muted-foreground">
              Product updates, improvements and fixes — published as they ship.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Every update, newest first. No account needed.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-8">
        <Suspense fallback={<TimelineSkeleton />}>
          <TimelineSection
            slug={workspace.slug}
            brandColor={brandColor}
            workspaceName={workspace.name}
          />
        </Suspense>
      </div>

      <footer className="mt-14 border-t pt-6 text-xs text-muted-foreground">
        <p>
          Powered by{" "}
          <Link
            href="/"
            className="font-medium underline-offset-4 hover:underline"
            style={{ color: brandColor === DEFAULT_BRAND_COLOR ? undefined : brandColor }}
          >
            ChangelogSync
          </Link>{" "}
          — a public changelog for every product, no sign-up required.
        </p>
      </footer>
    </main>
  );
}
