import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { DEFAULT_BRAND_COLOR } from "@/lib/changelog/format";

const LIVE_LINKS = [
  { href: "/c/acme", label: "/c/acme", hint: "Acme Analytics" },
  { href: "/c/demo", label: "/c/demo", hint: "Demo Product" },
] as const;

const DEV_LINKS = [
  { href: "/api/changelog/acme", label: "/api/changelog/acme", hint: "JSON" },
  { href: "/api/changelog/demo", label: "/api/changelog/demo", hint: "JSON" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm"
                style={{ backgroundColor: DEFAULT_BRAND_COLOR }}
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-semibold tracking-tight">ChangelogSync</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-pretty text-muted-foreground">
              Public changelogs your customers will actually read. One clean,
              searchable timeline per product — free to start, no account
              required for readers.
            </p>
            <Link
              href="/c/acme"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium"
              style={{ color: DEFAULT_BRAND_COLOR }}
            >
              Start with a live example
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>

          <nav aria-labelledby="footer-demos">
            <h2
              id="footer-demos"
              className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
            >
              Live changelogs
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {LIVE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex flex-col text-sm transition-colors"
                  >
                    <span className="font-medium group-hover:underline group-hover:underline-offset-4">
                      {link.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {link.hint}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-api">
            <h2
              id="footer-api"
              className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
            >
              Read-only API
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {DEV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex flex-col text-sm transition-colors"
                  >
                    <span className="font-medium group-hover:underline group-hover:underline-offset-4">
                      {link.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {link.hint}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-xs text-xs text-pretty text-muted-foreground">
              Same data as the public page, as JSON. No key, no rate-limit
              games.
            </p>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ChangelogSync. Built for products that ship often.</p>
          <p>Free to start · readers need no account.</p>
        </div>
      </div>
    </footer>
  );
}
