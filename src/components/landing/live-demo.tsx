import Link from "next/link";
import { ArrowUpRight, CalendarDays, CheckCircle2, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatEntryDate, withAlpha } from "@/lib/changelog/format";
import type { DemoWorkspace } from "@/components/landing/types";

export function LiveDemoSection({
  workspaces,
}: {
  workspaces: DemoWorkspace[];
}) {
  return (
    <section
      id="live-demos"
      aria-labelledby="live-demos-heading"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 lg:py-20"
    >
      <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        Live demos
      </p>
      <h2
        id="live-demos-heading"
        className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
      >
        Read the real thing, right now
      </h2>
      <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">
        No tour, no demo request. These are two workspaces running on the same
        public page your customers would open — searchable, filterable, and
        readable without an account.
      </p>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2">
        {workspaces.map((workspace) => (
          <li key={workspace.slug}>
            <Link
              href={`/c/${workspace.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-semibold shadow-sm"
                  style={{
                    backgroundColor: workspace.brandColor,
                    color: "#ffffff",
                  }}
                >
                  {workspace.name.trim()[0]?.toUpperCase() ?? "C"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold tracking-tight">
                    {workspace.name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    /c/{workspace.slug}
                  </p>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </div>

              <p className="mt-4 text-sm text-pretty text-muted-foreground">
                {workspace.blurb}
              </p>

              <dl className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {workspace.entryCount === null ? null : (
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">Published updates</dt>
                    <ListChecks aria-hidden="true" className="h-3.5 w-3.5" />
                    <dd>
                      {workspace.entryCount} published{" "}
                      {workspace.entryCount === 1 ? "update" : "updates"}
                    </dd>
                  </div>
                )}
                {workspace.latestDate === null ? null : (
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">Latest update</dt>
                    <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                    <dd>Latest {formatEntryDate(workspace.latestDate)}</dd>
                  </div>
                )}
              </dl>

              {workspace.latestTitle === null ? null : (
                <div
                  className="mt-5 rounded-xl border border-border/60 p-4"
                  style={{
                    backgroundColor: withAlpha(workspace.brandColor, 0.07),
                  }}
                >
                  <Badge
                    variant="outline"
                    className="border-transparent bg-background/70"
                  >
                    <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                    Newest entry
                  </Badge>
                  <p className="mt-2.5 text-sm font-medium text-pretty">
                    {workspace.latestTitle}
                  </p>
                </div>
              )}

              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                Open the changelog
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
