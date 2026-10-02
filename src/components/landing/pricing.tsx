import Link from "next/link";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_BRAND_COLOR, withAlpha } from "@/lib/changelog/format";

const FREE_FEATURES = [
  "A public changelog at /c/your-product",
  "Entries grouped by month, newest first",
  "Category tags, live search and filter chips",
  "Add, edit, publish and unpublish entries in the admin console",
  "Drafts stay private until you publish them",
  "Your own brand colour on your timeline",
  "A read-only JSON API for your changelog",
] as const;

const PRO_FEATURES = [
  "Custom domain (changelog.yourproduct.com)",
  "Full custom branding beyond the accent colour",
  "Embeddable widget for your own site",
  "GitHub pull-request automation",
  "AI-written draft summaries",
] as const;

export function PricingSection() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-20 border-y border-border/70 bg-muted/30"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Plans
        </p>
        <h2
          id="pricing-heading"
          className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          Free to start, thoroughly honest about what&apos;s next
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">
          Everything described on this page works today and costs nothing to
          use. The rest is a roadmap, clearly labelled as such.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div
            className="relative flex h-full flex-col rounded-2xl border p-6 shadow-sm sm:p-8"
            style={{
              borderColor: withAlpha(DEFAULT_BRAND_COLOR, 0.35),
              backgroundImage: `linear-gradient(135deg, ${withAlpha(
                DEFAULT_BRAND_COLOR,
                0.1,
              )} 0%, ${withAlpha(DEFAULT_BRAND_COLOR, 0)} 60%)`,
            }}
          >
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-transparent"
                style={{ backgroundColor: withAlpha(DEFAULT_BRAND_COLOR, 0.14) }}
              >
                Available now
              </Badge>
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">Free</h3>
            <p className="mt-2 text-sm text-pretty text-muted-foreground">
              The whole product as it stands today. No card, no trial timer, no
              sign-up for your readers.
            </p>

            <ul className="mt-6 flex flex-col gap-3 text-sm">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: DEFAULT_BRAND_COLOR }}
                  />
                  <span className="text-pretty">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <Button asChild size="lg" className="h-10 px-4">
                <Link href="/c/acme">
                  Browse a live changelog
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex h-full flex-col rounded-2xl border border-dashed border-border bg-card/60 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Clock3 aria-hidden="true" className="h-3 w-3" />
                Coming soon
              </Badge>
              <span className="text-xs text-muted-foreground">
                Planned — not available today
              </span>
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-muted-foreground">
              Pro
            </h3>
            <p className="mt-2 text-sm text-pretty text-muted-foreground">
              The work we want to do next. No date to announce and no price to
              quote yet — when it ships, this is what it will cover.
            </p>

            <ul className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Clock3
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 opacity-60"
                  />
                  <span className="text-pretty">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <p className="text-sm text-muted-foreground">
                Nothing to buy, nothing to install. The free changelog stays
                free.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
