/**
 * ChangelogSync — plan/tier limits.
 *
 * Free tier: 1 connected repository, 10 changelog entries per month.
 * Pro tier: unlimited (Stripe wiring lands in a later milestone; the
 * toggle gate below only consults `profiles.plan` as specified).
 */

/** Max repositories a free workspace may have enabled at once. */
export const FREE_PLAN_MAX_REPOS = 1;

/** Max changelog entries a free workspace may generate per month. */
export const FREE_PLAN_MAX_ENTRIES_PER_MONTH = 10;