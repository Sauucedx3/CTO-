import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/** Sample workspaces seeded in the file store — always available, no sign-up. */
const SAMPLE_CHANGELOGS = [
  { slug: "acme", name: "Acme Analytics", blurb: "Dashboards, saved views and query tips." },
  { slug: "demo", name: "Demo Product", blurb: "A second product timeline, different brand colour." },
] as const;

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <Badge variant="secondary" className="mb-6">
        Public changelog — live now
      </Badge>
      <h1 className="text-balance text-center text-4xl font-semibold tracking-tight sm:text-5xl">
        ChangelogSync
      </h1>
      <p className="mt-4 max-w-xl text-pretty text-center text-muted-foreground">
        A clean, searchable product-update timeline for your customers. No
        sign-up for them, nothing to configure — your changelog lives at one
        public link.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/c/acme">
            <Sparkles className="h-4 w-4" />
            See a live changelog
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Open the dashboard</Link>
        </Button>
      </div>

      <Separator className="my-10 max-w-md" />

      <section
        aria-labelledby="samples-heading"
        className="w-full max-w-2xl text-left"
      >
        <h2
          id="samples-heading"
          className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
        >
          Sample changelogs
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {SAMPLE_CHANGELOGS.map((sample) => (
            <li key={sample.slug}>
              <Link
                href={`/c/${sample.slug}`}
                className="group flex h-full flex-col justify-between rounded-xl border bg-card p-5 transition-colors hover:border-foreground/30 hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{sample.name}</p>
                  <p className="mt-1 text-sm text-pretty text-muted-foreground">
                    {sample.blurb}
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  /c/{sample.slug}
                  <ArrowRight
                    aria-hidden="true"
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 max-w-xl text-balance text-center text-sm text-muted-foreground">
        Category tags, instant search and month-grouped release notes work with
        no account and no external services. Automation from GitHub, custom
        domains, an embeddable widget and billing are the Pro roadmap.
      </p>
    </main>
  );
}
