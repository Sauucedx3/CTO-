import Link from "next/link";
import { ArrowRight, Link2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryMeta } from "@/lib/changelog/categories";
import {
  DEFAULT_BRAND_COLOR,
  formatEntryDate,
  withAlpha,
} from "@/lib/changelog/format";
import type { PreviewEntry } from "@/components/landing/types";

/** Shown when the store has no published entries to preview. */
const FALLBACK_PREVIEW: PreviewEntry[] = [
  {
    title: "Saved views for every dashboard",
    category: "feature",
    created_at: "2026-09-12T15:30:00.000Z",
  },
  {
    title: "Fix timezone drift in scheduled reports",
    category: "fix",
    created_at: "2026-09-03T10:05:00.000Z",
  },
  {
    title: "Faster workspace search",
    category: "improvement",
    created_at: "2026-08-27T08:45:00.000Z",
  },
];

export function LandingHero({
  previewEntries,
  previewSlug,
  previewName,
}: {
  previewEntries: PreviewEntry[];
  previewSlug: string;
  previewName: string;
}) {
  const entries =
    previewEntries.length > 0 ? previewEntries.slice(0, 3) : FALLBACK_PREVIEW;

  return (
    <section className="relative overflow-hidden">
      {/* Brand wash + grid, matching the tinted header on the timeline pages. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          backgroundImage: `radial-gradient(60% 100% at 50% 0%, ${withAlpha(
            DEFAULT_BRAND_COLOR,
            0.18,
          )} 0%, ${withAlpha(DEFAULT_BRAND_COLOR, 0)} 70%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
        style={{
          backgroundImage: `linear-gradient(to right, ${withAlpha(
            DEFAULT_BRAND_COLOR,
            0.09,
          )} 1px, transparent 1px), linear-gradient(to bottom, ${withAlpha(
            DEFAULT_BRAND_COLOR,
            0.09,
          )} 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:pt-24 lg:pb-28">
        <div className="max-w-xl">
          <Badge
            variant="outline"
            className="border-transparent"
            style={{ backgroundColor: withAlpha(DEFAULT_BRAND_COLOR, 0.12) }}
          >
            <Sparkles aria-hidden="true" className="h-3 w-3" />
            Free to start · no sign-up for readers
          </Badge>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
            Public changelogs your customers will{" "}
            <span style={{ color: DEFAULT_BRAND_COLOR }}>actually read</span>
          </h1>

          <p className="mt-5 text-lg text-pretty text-muted-foreground">
            ChangelogSync turns your product updates into one clean, searchable
            timeline at{" "}
            <span className="font-medium text-foreground">/c/your-product</span>{" "}
            — grouped by month, tagged by category, and open to anyone without
            an account.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-11 px-5 text-base">
              <Link href="/c/acme">
                Browse a live changelog
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 px-5 text-base"
            >
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Two timelines are live right now:{" "}
            <Link
              href="/c/acme"
              className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:decoration-solid"
            >
              /c/acme
            </Link>{" "}
            and{" "}
            <Link
              href="/c/demo"
              className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:decoration-solid"
            >
              /c/demo
            </Link>
            . Real pages, real entries — not mockups.
          </p>
        </div>

        <ChangelogPreview
          entries={entries}
          slug={previewSlug}
          workspaceName={previewName}
        />
      </div>
    </section>
  );
}

/** A browser-framed still of the real timeline: same cards, same badges. */
function ChangelogPreview({
  entries,
  slug,
  workspaceName,
}: {
  entries: PreviewEntry[];
  slug: string;
  workspaceName: string;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-4 -z-10 rounded-3xl blur-2xl"
        style={{
          backgroundImage: `linear-gradient(135deg, ${withAlpha(
            DEFAULT_BRAND_COLOR,
            0.22,
          )} 0%, ${withAlpha(DEFAULT_BRAND_COLOR, 0)} 70%)`,
        }}
      />
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl shadow-foreground/5">
        <div className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-3">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground">
            <Link2 aria-hidden="true" className="h-3 w-3 shrink-0" />
            <span className="truncate">/c/{slug}</span>
          </span>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold text-white shadow-sm"
                style={{ backgroundColor: DEFAULT_BRAND_COLOR }}
              >
                {workspaceName.trim()[0]?.toUpperCase() ?? "C"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">
                  {workspaceName}
                </p>
                <p className="text-xs text-muted-foreground">What&apos;s new</p>
              </div>
            </div>
            <span className="hidden shrink-0 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex">
              Search updates…
            </span>
          </div>

          <ol className="relative mt-5 flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-[2px] before:bg-border before:content-['']">
            {entries.map((entry) => {
              const meta = categoryMeta(entry.category);
              return (
                <li key={entry.title} className="relative pl-6">
                  <span
                    aria-hidden="true"
                    className="absolute top-4 left-[1px] h-2 w-2 rounded-full ring-4 ring-card"
                    style={{ backgroundColor: meta.accent }}
                  />
                  <div className="rounded-xl border border-border/70 bg-background/60 p-3.5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`gap-1 border ${meta.badgeClass}`}
                      >
                        <span aria-hidden="true">{meta.emoji}</span>
                        {meta.label}
                      </Badge>
                      <time
                        dateTime={entry.created_at}
                        className="text-xs text-muted-foreground"
                      >
                        {formatEntryDate(entry.created_at)}
                      </time>
                    </div>
                    <p className="mt-2 text-sm font-medium tracking-tight text-pretty">
                      {entry.title}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-5 text-xs text-muted-foreground">
            Previews of real entries. Open the page for working search, category
            filters and the full month-by-month history.
          </p>
        </div>
      </div>
    </div>
  );
}
