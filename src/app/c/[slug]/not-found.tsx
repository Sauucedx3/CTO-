import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Friendly 404 for an unknown workspace slug (responds 404, not 500). */
export default function WorkspaceNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        404 — changelog not found
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        That changelog doesn&apos;t exist
      </h1>
      <p className="mt-4 max-w-md text-pretty text-muted-foreground">
        No workspace is published at this address. Check the link you were given,
        or open one of the sample changelogs below.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to the homepage</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/c/acme">See a sample changelog</Link>
        </Button>
      </div>
      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        ChangelogSync
      </Link>
    </main>
  );
}
