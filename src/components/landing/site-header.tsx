import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_BRAND_COLOR } from "@/lib/changelog/format";

const NAV = [
  { href: "#live-demos", label: "Live demos" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#categories", label: "Categories" },
  { href: "#pricing", label: "Plans" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-5 py-3 sm:px-8">
        <Link
          href="/"
          aria-label="ChangelogSync home"
          className="flex items-center gap-2.5"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm"
            style={{ backgroundColor: DEFAULT_BRAND_COLOR }}
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-semibold tracking-tight">ChangelogSync</span>
        </Link>

        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-6 text-sm text-muted-foreground">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto">
          <Button asChild size="sm" className="h-8 px-3">
            <Link href="/c/acme">
              <span className="hidden sm:inline">Browse a changelog</span>
              <span className="sm:hidden">Live demo</span>
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
