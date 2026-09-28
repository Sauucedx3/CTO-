/**
 * ChangelogSync — presentation metadata for the three changelog categories.
 *
 * Kept free of React and of `node:*` imports so both the server page and the
 * client search island can import it.
 */
import type { Category } from "@/lib/store";

export interface CategoryMeta {
  /** Stored value (`entry.category`). */
  value: Category;
  /** Emoji shown in badges and filter chips. */
  emoji: string;
  /** Full human label, e.g. "New Features". */
  label: string;
  /** Tailwind classes for the category badge (light + dark). */
  badgeClass: string;
  /** Hex accent used for the timeline dot (inline style, runtime-safe). */
  accent: string;
}

/** Display order for feature chips and legend. */
export const CATEGORY_ORDER: Category[] = ["feature", "fix", "improvement"];

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  feature: {
    value: "feature",
    emoji: "✨",
    label: "New Features",
    badgeClass:
      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-300",
    accent: "#6366f1",
  },
  fix: {
    value: "fix",
    emoji: "🐛",
    label: "Bug Fixes",
    badgeClass:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300",
    accent: "#e11d48",
  },
  improvement: {
    value: "improvement",
    emoji: "⚡",
    label: "Improvements",
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
    accent: "#d97706",
  },
};

/** Never throws: an unexpected stored value falls back to the feature meta. */
export function categoryMeta(category: Category | string): CategoryMeta {
  return (
    CATEGORY_META[category as Category] ??
    ({
      value: "feature",
      emoji: "📝",
      label: "Update",
      badgeClass:
        "border-border bg-muted text-muted-foreground dark:bg-muted/50",
      accent: "#64748b",
    } satisfies CategoryMeta)
  );
}

/** Compact `"✨ New Features"` label used in chips and the timeline legend. */
export function categoryLabel(category: Category | string): string {
  const meta = categoryMeta(category);
  return `${meta.emoji} ${meta.label}`;
}
