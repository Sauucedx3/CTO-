import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * Landing page — minimal placeholder for milestone 1.
 * Will evolve into the marketing/coming-soon + sign-in surface.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <Badge variant="secondary" className="mb-6">
        Foundation — milestone 1 of 6
      </Badge>
      <h1 className="text-balance text-center text-4xl font-semibold tracking-tight sm:text-5xl">
        ChangelogSync
      </h1>
      <p className="mt-4 max-w-xl text-pretty text-center text-muted-foreground">
        Turn merged GitHub pull requests into polished, public release notes —
        automatically.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/dashboard">
            <Sparkles className="h-4 w-4" />
            Go to dashboard
          </Link>
        </Button>
      </div>
      <Separator className="my-10 max-w-md" />
      <p className="text-balance text-center text-sm text-muted-foreground">
        GitHub OAuth, repo dashboard, webhook listener, AI summaries and the
        public changelog timeline land in the next milestones.
      </p>
    </main>
  );
}