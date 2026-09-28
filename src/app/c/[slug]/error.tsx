"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for /c/[slug]. A corrupt store file must be loud rather than
 * silently rendering an empty timeline.
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        Something went wrong
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        This changelog couldn&apos;t be loaded
      </h1>
      <p className="mt-4 max-w-md text-pretty text-muted-foreground">
        The changelog data on this server is unreadable right now. Retrying often
        fixes it; nothing was changed by your visit.
      </p>
      <p className="mt-2 font-mono text-xs text-muted-foreground/80">
        {error.digest ? `ref ${error.digest}` : null}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to the homepage</Link>
        </Button>
      </div>
    </main>
  );
}
