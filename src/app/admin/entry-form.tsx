"use client";

/**
 * Create / edit dialog for a changelog entry.
 *
 * Purely presentational + local form state: the parent console owns the token,
 * the API calls and the toasts. `onSubmit` resolves to `true` when the entry
 * was saved, which is when this dialog closes itself.
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { type CategoryMeta } from "@/lib/changelog/categories";
import type { Category } from "@/lib/store";

/** The values the form produces, in the shape the admin API expects. */
export interface EntryFormValues {
  title: string;
  body: string;
  category: Category;
  tags: string[];
  published: boolean;
}

interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` → create mode; an entry → edit mode. */
  entry: (EntryFormValues & { id: string }) | null;
  categories: CategoryMeta[];
  /** Resolve `true` on success (the dialog then closes). */
  onSubmit: (values: EntryFormValues) => Promise<boolean>;
}

const BODY_PLACEHOLDER =
  "What changed, and why it matters to your users.\n\nSimple Markdown is rendered on the public page:\n- bullet lists\n- **bold** and `code`\n- [links](https://example.com)";

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function EntryFormDialog({
  open,
  onOpenChange,
  entry,
  categories,
  onSubmit,
}: EntryFormDialogProps) {
  // Seed straight from props. The console remounts this dialog (fresh `key`)
  // on every open, so a cancelled edit can never leak into the next one — which
  // is also why there is no reset effect here.
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [category, setCategory] = useState<Category>(entry?.category ?? "feature");
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [published, setPublished] = useState(entry?.published ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = entry !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("A title is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const ok = await onSubmit({
        title: trimmedTitle,
        body,
        category,
        tags: parseTags(tags),
        published,
      });
      if (ok) onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!submitting ? onOpenChange(next) : undefined)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit entry" : "New entry"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes go live on the public timeline as soon as you save (drafts stay hidden)."
              : "Published entries appear on the public timeline immediately; drafts stay hidden until published."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="entry-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="entry-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Faster search on the timeline"
              maxLength={200}
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">{title.trim().length}/200 characters</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="entry-category" className="text-sm font-medium">
                Category
              </label>
              <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
                <SelectTrigger id="entry-category" className="w-full">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((meta) => (
                    <SelectItem key={meta.value} value={meta.value}>
                      <span aria-hidden="true">{meta.emoji}</span>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="entry-tags" className="text-sm font-medium">
                Tags <span className="text-muted-foreground">(comma separated)</span>
              </label>
              <Input
                id="entry-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="search, performance"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="entry-body" className="text-sm font-medium">
              Body
            </label>
            <textarea
              id="entry-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={BODY_PLACEHOLDER}
              rows={8}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                {published ? "Published" : "Draft"}
                <span className="text-xs font-normal text-muted-foreground">
                  {published ? "visible at /c/…" : "hidden from the public timeline"}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {published
                  ? "Customers can read this entry as soon as you save."
                  : "Only visible here in the admin console."}
              </p>
            </div>
            <Switch
              checked={published}
              onCheckedChange={setPublished}
              aria-label="Publish this entry"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Create entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
