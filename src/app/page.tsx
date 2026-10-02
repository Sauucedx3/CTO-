import type { Metadata } from "next";
import { CategoryShowcaseSection } from "@/components/landing/category-showcase";
import { LandingHero } from "@/components/landing/hero";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { LiveDemoSection } from "@/components/landing/live-demo";
import { PricingSection } from "@/components/landing/pricing";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import type {
  DemoData,
  DemoWorkspace,
  PreviewEntry,
} from "@/components/landing/types";
import { DEFAULT_BRAND_COLOR, normalizeBrandColor } from "@/lib/changelog/format";
import { listPublishedEntries, listWorkspaces } from "@/lib/store";

// The landing advertises live data (entry counts, newest headlines), so it
// reads the file store per request — same as the public /c/[slug] timeline.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: {
    absolute: "ChangelogSync — public changelogs your customers will read",
  },
  description:
    "ChangelogSync turns your product updates into one clean, searchable, category-tagged timeline at /c/your-product. Free to start, no sign-up for readers.",
  alternates: { canonical: "/" },
};

/** Copy used only when a workspace is missing from the built-in blurbs map. */
const DEFAULT_BLURB =
  "Product updates, improvements and fixes — published as they ship.";

const BLURBS: Record<string, string> = {
  acme: "Dashboards, saved views and the query tips behind them.",
  demo: "A second product timeline running its own brand colour.",
};

/**
 * Shown only when the store cannot be read (fresh machine, empty data dir).
 * Links stay real; counts and "newest entry" are omitted rather than faked.
 */
const FALLBACK_WORKSPACES: DemoWorkspace[] = [
  {
    slug: "acme",
    name: "Acme Analytics",
    blurb: BLURBS.acme,
    brandColor: DEFAULT_BRAND_COLOR,
    entryCount: null,
    latestTitle: null,
    latestDate: null,
  },
  {
    slug: "demo",
    name: "Demo Product",
    blurb: BLURBS.demo,
    brandColor: "#0ea5e9",
    entryCount: null,
    latestTitle: null,
    latestDate: null,
  },
];

async function loadDemoData(): Promise<DemoData> {
  try {
    const workspaces = await listWorkspaces();

    const demoWorkspaces = await Promise.all(
      workspaces.map(async (workspace): Promise<DemoWorkspace> => {
        const entries = await listPublishedEntries(workspace.slug);
        const latest = entries[0];
        return {
          slug: workspace.slug,
          name: workspace.name,
          blurb: BLURBS[workspace.slug] ?? DEFAULT_BLURB,
          brandColor: normalizeBrandColor(workspace.brand_color),
          entryCount: entries.length,
          latestTitle: latest?.title ?? null,
          latestDate: latest?.created_at ?? null,
        };
      }),
    );

    const firstWithEntries = demoWorkspaces.find(
      (workspace) => workspace.entryCount !== null && workspace.entryCount > 0,
    );
    const previewEntries: PreviewEntry[] = firstWithEntries
      ? (
          await listPublishedEntries(firstWithEntries.slug, 3)
        ).map((entry) => ({
          title: entry.title,
          category: entry.category,
          created_at: entry.created_at,
        }))
      : [];

    return { workspaces: demoWorkspaces, previewEntries };
  } catch (error) {
    // A broken or absent store must never take the marketing page down.
    console.error("Landing page could not read the changelog store:", error);
    return { workspaces: [], previewEntries: [] };
  }
}

export default async function Home() {
  const { workspaces, previewEntries } = await loadDemoData();
  const demos = workspaces.length > 0 ? workspaces : FALLBACK_WORKSPACES;
  const previewWorkspace = demos[0];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <LandingHero
          previewEntries={previewEntries}
          previewSlug={previewWorkspace.slug}
          previewName={previewWorkspace.name}
        />
        <LiveDemoSection workspaces={demos} />
        <HowItWorksSection />
        <CategoryShowcaseSection />
        <PricingSection />
      </main>
      <SiteFooter />
    </div>
  );
}
