/**
 * Human-readable messages for the `?auth_error=` codes the OAuth callback
 * redirects with. Keyed by the URL param so the dashboard can render a
 * friendly banner instead of an opaque error page.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  denied: "GitHub sign-in was cancelled. No changes were made.",
  invalid_state:
    "This sign-in link is invalid or expired. Please start again from the dashboard.",
  exchange_failed:
    "GitHub couldn't be reached while signing you in. Please try again in a moment.",
  signup_failed:
    "We couldn't create your ChangelogSync account. Please try again in a moment.",
  signin_failed:
    "We couldn't start your session. Please try again in a moment.",
  config:
    "GitHub sign-in isn't configured yet. Please come back later.",
};

export function authErrorMessage(authError: string | null | undefined): string | null {
  if (!authError) return null;
  return (
    AUTH_ERROR_MESSAGES[authError] ??
    "Something went wrong during sign-in. Please try again."
  );
}