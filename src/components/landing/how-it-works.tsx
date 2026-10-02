import { PenLine, Share2, Tag } from "lucide-react";
import { DEFAULT_BRAND_COLOR, withAlpha } from "@/lib/changelog/format";

const STEPS = [
  {
    icon: Tag,
    title: "Pick your public URL",
    body: "A workspace is one product with one link: /c/your-product. It has a name, a slug and a brand colour — that is the entire configuration.",
  },
  {
    icon: PenLine,
    title: "Write the updates",
    body: "The admin console is token-protected: add, edit, publish or unpublish entries, tag them by category, and keep drafts private until they are ready.",
  },
  {
    icon: Share2,
    title: "Share the link",
    body: "Customers open /c/your-product and get the whole history, newest first, grouped by month — with instant search and category filters. No account, no email wall.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-20 border-y border-border/70 bg-muted/30"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          How it works
        </p>
        <h2
          id="how-it-works-heading"
          className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          Three steps, no integration required
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">
          ChangelogSync runs as a standalone public page. There is nothing to
          install in your app, and nothing for your customers to set up.
        </p>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: withAlpha(DEFAULT_BRAND_COLOR, 0.12),
                    color: DEFAULT_BRAND_COLOR,
                  }}
                >
                  <step.icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Step {index + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-balance">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-pretty text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
