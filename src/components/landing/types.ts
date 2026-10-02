/**
 * ChangelogSync landing page — shared view types.
 *
 * These are presentation-only shapes: the `/` server component reads the file
 * store and hands plain JSON down to the landing sections, which stay
 * synchronous and dependency-free (no `node:fs` in the view layer).
 */
import type { Category } from "@/lib/store";

/** One entry shown inside the hero's changelog preview. */
export interface PreviewEntry {
  title: string;
  category: Category;
  /** ISO timestamp — formatted with the timeline's UTC date formatter. */
  created_at: string;
}

/** A real workspace from the store, summarised for the live-demo section. */
export interface DemoWorkspace {
  slug: string;
  name: string;
  /** Short, descriptive line — never a claim about the product. */
  blurb: string;
  /** Normalised `#rrggbb` brand colour of the workspace. */
  brandColor: string;
  /** Published entry count, or `null` when the store could not be read. */
  entryCount: number | null;
  /** Newest published entry's headline, or `null` when unavailable. */
  latestTitle: string | null;
  /** Newest published entry's ISO date, or `null` when unavailable. */
  latestDate: string | null;
}

/** Output of the landing page's store read. */
export interface DemoData {
  workspaces: DemoWorkspace[];
  /** Entries for the hero preview (newest first). Empty → static fallback. */
  previewEntries: PreviewEntry[];
}
