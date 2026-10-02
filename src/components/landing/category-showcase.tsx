import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_ORDER,
  categoryMeta,
  type CategoryMeta,
} from "@/lib/changelog/categories";
import {
  DEFAULT_BRAND_COLOR,
  normalizeBrandColor,
  readableTextColor,
  withAlpha,
} from "@/lib/changelog/format";

/** What each tag means to a reader — plain language, no marketing. */
const BLURBS: Record<string, string> = {
  feature: "What your product can do now, listed first for the people who asked for it.",
  fix: "What broke and what is fixed. A changelog that admits bugs is one readers believe.",
  improvement: "Faster pages, clearer copy, better defaults — the wins that never get their own announcement.",
};

interface ShowcaseItem {
  meta: CategoryMeta;
  /** Normalised colour used for the card's tint and rule. */
  color: string;
  /** Text colour that stays readable on top of `color`. */
  textColor: string;
}

const ITEMS: ShowcaseItem[] = CATEGORY_ORDER.map((category) => {
  const meta = categoryMeta(category);
  const color = normalizeBrandColor(meta.accent);
  return { meta, color, textColor: readableTextColor(color) };
});

export function CategoryShowcaseSection() {
  return (
    <section
      id="categories"
      aria-labelledby="categories-heading"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 lg:py-20"
    >
      <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        Categories
      </p>
      <h2
        id="categories-heading"
        className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
      >
        Three tags your readers can filter on
      </h2>
      <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">
        Every entry carries one category. Readers tap a chip and see only that
        kind of update — so the people who only care about bug fixes can read
        just those.
      </p>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map(({ meta, color, textColor }) => (
          <li
            key={meta.value}
            className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
          >
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-sm"
              style={{ backgroundColor: color, color: textColor }}
            >
              {meta.emoji}
            </span>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">
              <span aria-hidden="true" className="mr-1.5">
                {meta.emoji}
              </span>
              {meta.label}
            </h3>
            <p className="mt-2 text-sm text-pretty text-muted-foreground">
              {BLURBS[meta.value]}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Badge variant="outline" className={`gap-1 border ${meta.badgeClass}`}>
                <span aria-hidden="true">{meta.emoji}</span>
                {meta.label}
              </Badge>
            </div>
            <span
              aria-hidden="true"
              className="mt-5 h-1 w-full rounded-full"
              style={{ backgroundColor: withAlpha(color, 0.45) }}
            />
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Categories are fixed for now, which keeps filters predictable:{" "}
        {CATEGORY_ORDER.length} tags across every changelog.{" "}
        <span style={{ color: DEFAULT_BRAND_COLOR }} className="font-medium">
          Brand colour is per workspace.
        </span>
      </p>
    </section>
  );
}
