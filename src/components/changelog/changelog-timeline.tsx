"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { EntryBody } from "@/components/changelog/entry-body";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bodyToPlainText } from "@/lib/changelog/body";
import {
  CATEGORY_ORDER,
  categoryMeta,
  type CategoryMeta,
} from "@/lib/changelog/categories";
import {
  formatEntryDate,
  formatMonthLabel,
  monthKey,
  readableTextColor,
  withAlpha,
} from "@/lib/changelog/format";
import type { Category } from "@/lib/store";
import { cn } from "cn";

/** The serialisable slice of a stored entry that the client island needs. */
export interface TimelineEntry {
  id: string;
  title: string;
  body: string;
  category: Category;
  tags: string[];
  created_at: string;
}

interface IndexedEntry extends TimelineEntry {
  /** Lower-cased title + plain-text body + tags, built once per entry. */
  haystack: string;
}

interface MonthGroup {
  key: string;
  label: string;
  entries: IndexedEntry[];
}

type CategoryFilter = Category | "all";

export interface ChangelogTimelineProps {
  entries: TimelineEntry[];
  /** Normalised `#rrggbb` brand colour of the workspace. */
  brandColor: string;
  /** Workspace name — only used for accessible labels. */
  workspaceName: string;
}

/**
 * Client island: live search + category filter over an already-rendered list.
 * Entries arrive as plain JSON from the server component (no store access in
 * the browser), so the page itself keeps working with JS disabled.
 */
export function ChangelogTimeline({
  entries,
  brandColor,
  workspaceName,
}: ChangelogTimelineProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const brandText = readableTextColor(brandColor);

  const indexed = useMemo<IndexedEntry[]>(
    () =>
      entries.map((entry) => ({
        ...entry,
        haystack: [entry.title, bodyToPlainText(entry.body), entry.tags.join(" ")]
          .join(" ")
          .toLowerCase(),
      })),
    [entries],
  );

  const counts = useMemo(() => {
    const map = new Map<Category, number>();
    for (const entry of indexed) {
      map.set(entry.category, (map.get(entry.category) ?? 0) + 1);
    }
    return map;
  }, [indexed]);

  const availableCategories = useMemo(
    () => CATEGORY_ORDER.filter((category) => (counts.get(category) ?? 0) > 0),
    [counts],
  );

  const trimmedQuery = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      indexed.filter((entry) => {
        if (filter !== "all" && entry.category !== filter) return false;
        return trimmedQuery.length === 0 || entry.haystack.includes(trimmedQuery);
      }),
    [indexed, filter, trimmedQuery],
  );

  const groups = useMemo<MonthGroup[]>(() => {
    const byMonth = new Map<string, MonthGroup>();
    for (const entry of visible) {
      const key = monthKey(entry.created_at);
      const existing = byMonth.get(key);
      if (existing) {
        existing.entries.push(entry);
      } else {
        byMonth.set(key, {
          key,
          label: formatMonthLabel(entry.created_at),
          entries: [entry],
        });
      }
    }
    return [...byMonth.values()];
  }, [visible]);

  const isFiltered = trimmedQuery.length > 0 || filter !== "all";

  if (entries.length === 0) {
    return (
      <EmptyCard
        title="No updates yet"
        body="This changelog is live, but nothing has been published yet. Check back soon."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border/70 bg-background/85 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search updates…"
              aria-label={`Search updates from ${workspaceName}`}
              className="h-9 w-full"
            />
          </div>
          <p
            aria-live="polite"
            className="text-sm text-muted-foreground sm:text-right"
          >
            {isFiltered
              ? `${visible.length} of ${entries.length} updates`
              : `${entries.length} update${entries.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            brandColor={brandColor}
            brandText={brandText}
          >
            All
          </FilterChip>
          {availableCategories.map((category) => {
            const meta = categoryMeta(category);
            return (
              <FilterChip
                key={category}
                active={filter === category}
                onClick={() => setFilter(category)}
                brandColor={brandColor}
                brandText={brandText}
              >
                <span aria-hidden="true">{meta.emoji}</span>
                {meta.label}
              </FilterChip>
            );
          })}
          {isFiltered ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyCard
          title="No matching updates"
          body={`Nothing matches “${query.trim()}”. Try a different phrase, or clear the filters.`}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-5">
              <h2 className="flex items-center gap-3 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                <span
                  className="rounded-full border px-3 py-1"
                  style={{ borderColor: withAlpha(brandColor, 0.35) }}
                >
                  {group.label}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </h2>
              <ol className="relative flex flex-col gap-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-[2px] before:bg-border before:content-['']">
                {group.entries.map((entry) => (
                  <TimelineItem key={entry.id} entry={entry} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ entry }: { entry: IndexedEntry }) {
  const meta: CategoryMeta = categoryMeta(entry.category);
  const bodyIsEmpty = bodyToPlainText(entry.body).length === 0;

  return (
    <li className="relative pl-8 sm:pl-10">
      <span
        aria-hidden="true"
        className="absolute top-5 left-[7px] h-2.5 w-2.5 rounded-full ring-4 ring-background"
        style={{ backgroundColor: meta.accent }}
      />
      <article className="rounded-xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn("gap-1 border", meta.badgeClass)}
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
        <h3 className="mt-3 text-lg font-semibold tracking-tight text-balance sm:text-xl">
          {entry.title}
        </h3>
        {bodyIsEmpty ? null : <EntryBody body={entry.body} className="mt-3" />}
        {entry.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <li key={tag}>
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  #{tag}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </li>
  );
}

function FilterChip({
  active,
  onClick,
  brandColor,
  brandText,
  children,
}: {
  active: boolean;
  onClick: () => void;
  brandColor: string;
  brandText: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={active ? { backgroundColor: brandColor, color: brandText } : undefined}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-transparent shadow-sm"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function EmptyCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/60 p-10 text-center">
      <Sparkles
        aria-hidden="true"
        className="mx-auto h-6 w-6 text-muted-foreground"
      />
      <h2 className="mt-4 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-pretty text-muted-foreground">
        {body}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
