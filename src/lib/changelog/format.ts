/**
 * ChangelogSync — date/colour helpers for the public timeline.
 *
 * All date formatting pins the time zone to UTC so the server render and the
 * client island always produce identical strings (no hydration mismatch).
 */

const DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** `"2026-09-12T15:30:00.000Z"` → `"September 12, 2026"`. */
export function formatEntryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Undated";
  return DAY_FORMAT.format(date);
}

/** `"2026-09"` — grouping key for the month headings. */
export function monthKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** `"September 2026"` — the heading shown above each month's entries. */
export function formatMonthLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Undated";
  return MONTH_FORMAT.format(date);
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** The brand used when a workspace has no (or an unusable) `brand_color`. */
export const DEFAULT_BRAND_COLOR = "#6366f1";

/** Normalise any `brand_color` value to `#rrggbb`; falls back to the default. */
export function normalizeBrandColor(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || !HEX_RE.test(trimmed)) return DEFAULT_BRAND_COLOR;
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

/**
 * Append an alpha channel to a `#rrggbb` colour → `#rrggbbAA`.
 * `alpha` is 0–1. Returns the opaque colour when the input is unparseable.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${hex}${clamped.toString(16).padStart(2, "0")}`;
}

/**
 * Pick black or white text for a background colour using WCAG relative
 * luminance — keeps the branded header readable for light brand colours too.
 */
export function readableTextColor(hex: string): string {
  const match = HEX_RE.exec(hex);
  if (!match) return "#ffffff";
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(full.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.5 ? "#0b0b12" : "#ffffff";
}

/** First character of a workspace name, for the branded avatar tile. */
export function initialOf(name: string): string {
  return (name.trim()[0] ?? "C").toUpperCase();
}
