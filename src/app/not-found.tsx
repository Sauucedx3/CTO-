import Link from "next/link";
import { Button } from "@/components/ui/button";

/** App-wide 404. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        404 — page not found
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-4 max-w-md text-pretty text-muted-foreground">
        The link may be out of date. Start from the homepage or open a sample
        changelog.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to the homepage</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/c/acme">See a sample changelog</Link>
        </Button>
      </div>
    </main>
  );
}
