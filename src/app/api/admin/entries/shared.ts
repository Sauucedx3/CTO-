/**
 * Shared body → store-input coercion for the admin entry routes.
 *
 * Kept separate from `route.ts` because Next.js route files may only export
 * HTTP verbs, config, and a small allow-list of helpers.
 */
import { CATEGORIES, type Category, type NewStoredEntry, type StoredEntryPatch } from "@/lib/store";

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

/** Accept `["a","b"]` (canonical) or `"a, b"` (handy in curl). */
function readTags(raw: unknown): Parsed<string[] | undefined> {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: undefined };
  if (Array.isArray(raw)) {
    if (!raw.every((tag) => typeof tag === "string")) {
      return { ok: false, message: "`tags` must be an array of strings." };
    }
    return { ok: true, value: raw as string[] };
  }
  if (typeof raw === "string") {
    return {
      ok: true,
      value: raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
  }
  return { ok: false, message: "`tags` must be an array of strings." };
}

function readCategory(raw: unknown): Parsed<Category | undefined> {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: undefined };
  if (typeof raw !== "string" || !CATEGORIES.includes(raw as Category)) {
    return {
      ok: false,
      message: `\`category\` must be one of ${CATEGORIES.join(", ")}.`,
    };
  }
  return { ok: true, value: raw as Category };
}

function readBoolean(raw: unknown): Parsed<boolean | undefined> {
  if (raw === undefined || raw === null) return { ok: true, value: undefined };
  if (typeof raw === "boolean") return { ok: true, value: raw };
  if (raw === "true") return { ok: true, value: true };
  if (raw === "false") return { ok: true, value: false };
  return { ok: false, message: "`published` must be a boolean." };
}

function readString(raw: unknown, field: string): Parsed<string | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (typeof raw !== "string") return { ok: false, message: `\`${field}\` must be a string.` };
  return { ok: true, value: raw };
}

/** Coerce a POST body into `NewStoredEntry` (store still does final validation). */
export function entryInputFromBody(body: Record<string, unknown>): Parsed<NewStoredEntry> {
  const title = readString(body.title, "title");
  if (!title.ok) return title;
  if (title.value === undefined) return { ok: false, message: "`title` is required." };

  const bodyValue = readString(body.body, "body");
  if (!bodyValue.ok) return bodyValue;

  const category = readCategory(body.category);
  if (!category.ok) return category;

  const tags = readTags(body.tags);
  if (!tags.ok) return tags;

  const published = readBoolean(body.published);
  if (!published.ok) return published;

  return {
    ok: true,
    value: {
      title: title.value,
      body: bodyValue.value ?? "",
      category: category.value,
      tags: tags.value,
      published: published.value,
    },
  };
}

/**
 * Coerce a PATCH body into `StoredEntryPatch`. Only the fields actually present
 * are returned, so a partial update cannot blank out the rest of the entry
 * (except `body`, which is legitimately allowed to become empty).
 */
export function entryPatchFromBody(body: Record<string, unknown>): Parsed<StoredEntryPatch> {
  const patch: StoredEntryPatch = {};

  if ("title" in body) {
    const title = readString(body.title, "title");
    if (!title.ok) return title;
    if (title.value === undefined) return { ok: false, message: "`title` must be a string." };
    patch.title = title.value;
  }

  if ("body" in body) {
    const value = readString(body.body, "body");
    if (!value.ok) return value;
    patch.body = value.value ?? "";
  }

  if ("category" in body) {
    const category = readCategory(body.category);
    if (!category.ok) return category;
    if (category.value === undefined) {
      return { ok: false, message: `\`category\` must be one of ${CATEGORIES.join(", ")}.` };
    }
    patch.category = category.value;
  }

  if ("tags" in body) {
    const tags = readTags(body.tags);
    if (!tags.ok) return tags;
    patch.tags = tags.value ?? [];
  }

  if ("published" in body) {
    const published = readBoolean(body.published);
    if (!published.ok) return published;
    if (published.value === undefined) {
      return { ok: false, message: "`published` must be a boolean." };
    }
    patch.published = published.value;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: "Nothing to update — send title, body, category, tags or published." };
  }

  return { ok: true, value: patch };
}
