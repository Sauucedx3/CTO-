"use client";

/**
 * `/admin` console — the client half of MVP 3.
 *
 * Responsibilities:
 *  - carry the admin token (sessionStorage, this tab only — see
 *    `admin-token-store.ts`) and send it as `x-admin-token` on every request
 *  - load entries (drafts included) from the token-gated admin API
 *  - create / edit / delete / publish-unpublish entries through that API
 *
 * Nothing here is trusted by the server: every mutation is re-verified against
 * `<dataDir>/admin.token` with a constant-time compare, and the store validates
 * titles, categories, tags and slugs before writing.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import {
  readAdminToken,
  readServerAdminToken,
  subscribeAdminToken,
  writeAdminToken,
} from "@/app/admin/admin-token-store";
import { EntryFormDialog, type EntryFormValues } from "@/app/admin/entry-form";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { bodyToPlainText } from "@/lib/changelog/body";
import { categoryMeta, type CategoryMeta } from "@/lib/changelog/categories";
import { formatEntryDate } from "@/lib/changelog/format";
import type { Category } from "@/lib/store";
import { cn } from "@/lib/utils";

const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" };

export interface WorkspaceOption {
  slug: string;
  name: string;
  brand_color: string | null;
}

interface AdminEntry {
  id: string;
  title: string;
  body: string;
  category: Category;
  tags: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

/** A loaded page of admin data, tagged with the workspace it belongs to. */
interface AdminData {
  workspace: string;
  entries: AdminEntry[];
  drafts: number;
}

interface EntriesResponse {
  workspace: WorkspaceOption;
  entries: AdminEntry[];
  counts: Record<Category, number>;
  drafts: number;
}

interface AdminConsoleProps {
  workspaces: WorkspaceOption[];
  initialWorkspace: string;
  categories: CategoryMeta[];
}

class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Fetch JSON with the admin token; throws `ApiError` carrying the HTTP status. */
async function apiFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers ?? {}), "x-admin-token": token },
    cache: "no-store",
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

function entriesPath(workspaceSlug: string): string {
  return `/api/admin/entries?workspace=${encodeURIComponent(workspaceSlug)}`;
}

function entryPath(workspaceSlug: string, id: string): string {
  return `/api/admin/entries/${encodeURIComponent(id)}?workspace=${encodeURIComponent(workspaceSlug)}`;
}

export function AdminConsole({ workspaces, initialWorkspace, categories }: AdminConsoleProps) {
  const router = useRouter();

  /** `undefined` = not read yet (hydration), `null` = locked, string = unlocked. */
  const token = useSyncExternalStore(
    subscribeAdminToken,
    readAdminToken,
    readServerAdminToken
  );

  const [workspaceSlug, setWorkspaceSlug] = useState(initialWorkspace);
  const [tokenInput, setTokenInput] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateNotice, setGateNotice] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [data, setData] = useState<AdminData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<"all" | "published" | "drafts">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formInstance, setFormInstance] = useState<{
    key: number;
    entry: (EntryFormValues & { id: string }) | null;
  }>({ key: 0, entry: null });
  const [pendingDelete, setPendingDelete] = useState<AdminEntry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * Read one workspace's entries with a given token.
   * Every `setState` here sits behind the `await`, i.e. outside the effect's
   * synchronous body — that is what keeps `react-hooks/set-state-in-effect`
   * happy while still reacting to token/workspace changes.
   */
  const fetchEntries = useCallback(
    async (adminToken: string, slug: string, signal: AbortSignal) => {
      try {
        const payload = await apiFetch<EntriesResponse>(entriesPath(slug), adminToken, {
          signal,
        });
        if (signal.aborted) return;
        setData({ workspace: slug, entries: payload.entries, drafts: payload.drafts });
        setDataError(null);
      } catch (err) {
        if (signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          writeAdminToken(null);
          setData(null);
          setGateNotice("Your admin token was rejected. Paste the current token to continue.");
        } else if (!(err instanceof DOMException && err.name === "AbortError")) {
          setData(null);
          setDataError(err instanceof Error ? err.message : "Could not load entries.");
        }
      }
    },
    []
  );

  // Load whenever the token becomes available or the workspace changes.
  // The request is kicked off from a promise continuation, so the effect body
  // itself performs no synchronous state write
  // (react-hooks/set-state-in-effect) — the state settles in `fetchEntries`.
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const started = Promise.resolve().then(() =>
      fetchEntries(token, workspaceSlug, controller.signal)
    );
    return () => {
      controller.abort();
      void started.catch(() => undefined);
    };
  }, [token, workspaceSlug, reloadKey, fetchEntries]);

  const entries = useMemo(() => data?.entries ?? [], [data]);
  const drafts = data?.drafts ?? 0;
  const loading = token !== null && token !== undefined && data === null;
  const publishedCount = useMemo(() => entries.filter((e) => e.published).length, [entries]);
  const visibleEntries = useMemo(
    () =>
      entries.filter((entry) =>
        filter === "all" ? true : filter === "published" ? entry.published : !entry.published
      ),
    [entries, filter]
  );

  const activeWorkspace =
    workspaces.find((workspace) => workspace.slug === workspaceSlug) ?? workspaces[0];

  function lock(message?: string) {
    writeAdminToken(null);
    setData(null);
    setTokenInput("");
    setGateError(null);
    setGateNotice(message ?? null);
  }

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = tokenInput.trim();
    if (!candidate) {
      setGateError("Paste your admin token to continue.");
      return;
    }
    setVerifying(true);
    setGateError(null);
    try {
      // Probe before storing: a wrong token must never be remembered.
      await apiFetch<EntriesResponse>(entriesPath(workspaceSlug), candidate);
      setTokenInput("");
      setGateNotice(null);
      writeAdminToken(candidate);
      toast.success("Token accepted — you can manage entries now.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setGateError("That token does not match this app's admin.token.");
      } else {
        setGateError(err instanceof Error ? err.message : "Could not verify the token.");
      }
    } finally {
      setVerifying(false);
    }
  }

  function handleWorkspaceChange(slug: string) {
    setFilter("all");
    setData(null);
    setDataError(null);
    setWorkspaceSlug(slug);
    router.replace(`/admin?workspace=${encodeURIComponent(slug)}`, { scroll: false });
  }

  function handleRefresh() {
    setReloadKey((key) => key + 1);
  }

  /** Single funnel for mutations: 401 locks the console, errors become toasts. */
  async function mutate(path: string, init: RequestInit, successMessage: string): Promise<boolean> {
    if (!token) return false;
    try {
      await apiFetch(path, token, init);
      toast.success(successMessage);
      setReloadKey((key) => key + 1);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        lock("Your admin token was rejected. Paste the current token to continue.");
        toast.error("Admin token rejected");
      } else {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      }
      return false;
    }
  }

  function openCreate() {
    setFormInstance((current) => ({ key: current.key + 1, entry: null }));
    setFormOpen(true);
  }

  function openEdit(entry: AdminEntry) {
    setFormInstance((current) => ({
      key: current.key + 1,
      entry: {
        id: entry.id,
        title: entry.title,
        body: entry.body,
        category: entry.category,
        tags: entry.tags,
        published: entry.published,
      },
    }));
    setFormOpen(true);
  }

  async function handleFormSubmit(values: EntryFormValues): Promise<boolean> {
    const editing = formInstance.entry;
    if (editing) {
      return mutate(
        entryPath(workspaceSlug, editing.id),
        { method: "PATCH", body: JSON.stringify(values) },
        "Entry updated."
      );
    }
    return mutate(
      entriesPath(workspaceSlug),
      { method: "POST", body: JSON.stringify({ ...values, workspace: workspaceSlug }) },
      "Entry created."
    );
  }

  async function handleTogglePublished(entry: AdminEntry) {
    setBusyId(entry.id);
    await mutate(
      entryPath(workspaceSlug, entry.id),
      { method: "PATCH", body: JSON.stringify({ published: !entry.published }) },
      entry.published
        ? "Unpublished — it is now a draft, hidden from the public page."
        : "Published — it is live on the public timeline."
    );
    setBusyId(null);
  }

  async function handleDelete() {
    const target = pendingDelete;
    if (!target) return;
    setBusyId(target.id);
    const ok = await mutate(
      entryPath(workspaceSlug, target.id),
      { method: "DELETE" },
      `Deleted “${target.title}”.`
    );
    setBusyId(null);
    if (ok) setPendingDelete(null);
  }

  // -------------------------------------------------------------------------
  // Token gate (and the pre-hydration skeleton)
  // -------------------------------------------------------------------------
  if (token === undefined) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (token === null) {
    return (
      <div className="rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <LockKeyhole aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Admin token required</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This console is protected by the token generated at deploy time — the{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">admin.token</code> file in the
              app&apos;s data directory. It is kept in this browser tab only and sent to this app
              alone, never to a third party.
            </p>
          </div>
        </div>

        <form onSubmit={handleUnlock} className="mt-6 max-w-md space-y-3">
          <label htmlFor="admin-token" className="text-sm font-medium">
            Admin token
          </label>
          <Input
            id="admin-token"
            name="admin-token"
            type="password"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="64-character hex token"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
          {gateError ? (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
              <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {gateError}
            </p>
          ) : gateNotice ? (
            <p className="flex items-start gap-1.5 text-sm text-amber-700 dark:text-amber-300">
              <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {gateNotice}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              A wrong or missing token makes every request answer <code>401</code>.
            </p>
          )}
          <Button type="submit" disabled={verifying}>
            {verifying ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            Unlock console
          </Button>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Console
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="workspace" className="text-xs font-medium text-muted-foreground">
              Workspace
            </label>
            <Select value={workspaceSlug} onValueChange={handleWorkspaceChange}>
              <SelectTrigger id="workspace" className="min-w-44">
                <SelectValue placeholder="Pick a workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.slug} value={workspace.slug}>
                    <span className="font-medium">{workspace.name}</span>
                    <span className="text-muted-foreground">/c/{workspace.slug}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activeWorkspace ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/c/${activeWorkspace.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                View public page
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw
              aria-hidden="true"
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => lock("Locked in this tab.")}>
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
            Lock
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            New entry
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Entries" value={entries.length} />
        <StatCard
          label="Published"
          value={publishedCount}
          icon={<Eye aria-hidden="true" className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Drafts"
          value={drafts}
          icon={<FileText aria-hidden="true" className="h-3.5 w-3.5" />}
        />
        <StatCard label="Categories" value={categories.length} />
      </section>

      {drafts > 0 && activeWorkspace ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {drafts} draft {drafts === 1 ? "entry is" : "entries are"} hidden from{" "}
            <Link href={`/c/${activeWorkspace.slug}`} className="underline underline-offset-2">
              /c/{activeWorkspace.slug}
            </Link>
            . Publish them to make them public.
          </span>
        </p>
      ) : null}

      {dataError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {dataError}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Timeline content</h2>
          <div className="flex items-center gap-1.5">
            {(["all", "published", "drafts"] as const).map((value) => (
              <Button
                key={value}
                size="xs"
                variant={filter === value ? "secondary" : "ghost"}
                onClick={() => setFilter(value)}
              >
                {value === "all" ? "All" : value === "published" ? "Published" : "Drafts"}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              {entries.length === 0 ? "No entries yet" : `No ${filter} entries`}
            </p>
            <p className="mt-1">
              {entries.length === 0
                ? "Add your first update — it shows up on the public timeline right away."
                : "Switch the filter above to see the rest of the timeline."}
            </p>
            {entries.length === 0 ? (
              <Button size="sm" className="mt-4" onClick={openCreate}>
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                New entry
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleEntries.map((entry) => {
              const meta = categoryMeta(entry.category);
              const preview = bodyToPlainText(entry.body).trim();
              const busy = busyId === entry.id;
              return (
                <li key={entry.id} className="rounded-xl border bg-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn("border", meta.badgeClass)}>
                          <span aria-hidden="true">{meta.emoji}</span>
                          {meta.label}
                        </Badge>
                        {entry.published ? (
                          <Badge variant="secondary">Published</Badge>
                        ) : (
                          <Badge variant="destructive">Draft</Badge>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-pretty">{entry.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        <time dateTime={entry.created_at}>
                          Created {formatEntryDate(entry.created_at)}
                        </time>
                        {" · "}
                        <time dateTime={entry.updated_at}>
                          Updated {formatEntryDate(entry.updated_at)}
                        </time>
                        {entry.tags.length > 0
                          ? ` · ${entry.tags.map((tag) => `#${tag}`).join(" ")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(entry)}
                        disabled={busy}
                      >
                        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePublished(entry)}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        {entry.published ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPendingDelete(entry)}
                        disabled={busy}
                        aria-label={`Delete ${entry.title}`}
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  {preview ? (
                    <p className="mt-3 line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
                      {preview}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm italic text-muted-foreground">No body yet.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <EntryFormDialog
        key={formInstance.key}
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={formInstance.entry}
        categories={categories}
        onSubmit={handleFormSubmit}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => (!open ? setPendingDelete(null) : undefined)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>
              “{pendingDelete?.title}” will be removed from the file store and disappear from the
              public timeline. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={busyId !== null && busyId === pendingDelete?.id}
            >
              {busyId !== null && busyId === pendingDelete?.id ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              )}
              Delete entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
