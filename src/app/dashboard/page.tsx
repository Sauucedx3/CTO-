import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Authenticated-area placeholder.
 * Milestone 2 (GitHub OAuth onboarding + repository dashboard with toggles)
 * replaces this page.
 */
export default function DashboardPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            ChangelogSync — dashboard coming soon
          </CardTitle>
          <CardDescription>
            Milestone 2 adds GitHub sign-in and the repository dashboard here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This placeholder lives at <code className="text-foreground">/dashboard</code>{" "}
          and proves the app shell, layout, Tailwind, and shadcn/ui components
          are wired up for the next milestone.
        </CardContent>
      </Card>
    </main>
  );
}