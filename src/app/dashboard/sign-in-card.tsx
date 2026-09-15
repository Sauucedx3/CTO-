import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/github-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Sign-in screen shown to unauthenticated visitors of /dashboard. */
export function SignInCard({
  authErrorMsg,
  disabled = false,
}: {
  authErrorMsg: string | null;
  disabled?: boolean;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <GithubIcon className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Welcome to ChangelogSync</CardTitle>
          <CardDescription>
            Sign in with GitHub to connect repositories and start generating
            changelogs from your merged pull requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          {disabled ? (
            <Button size="lg" className="w-full" disabled>
              <GithubIcon className="size-4" />
              Sign in with GitHub
            </Button>
          ) : (
            <Button asChild size="lg" className="w-full">
              <Link href="/api/auth/github">
                <GithubIcon className="size-4" />
                Sign in with GitHub
              </Link>
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            ChangelogSync requests <code className="text-foreground">repo</code>{" "}
            and <code className="text-foreground">read:user</code> scopes so it
            can watch your repositories and attribute changes to you.
          </p>
        </CardContent>
        {authErrorMsg && (
          <CardFooter className="flex flex-col items-center gap-2">
            <div className="flex w-full items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{authErrorMsg}</span>
            </div>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}