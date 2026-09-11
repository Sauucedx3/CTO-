/**
 * Typed `process.env` for ChangelogSync.
 *
 * All variables are optional so the app typechecks and builds without real
 * secrets (see `.env.example` for the full list and `.env.local` for local
 * dummy values).
 */
declare namespace NodeJS {
  interface ProcessEnv {
    // -- Public (safe to expose to the browser) --
    readonly NEXT_PUBLIC_SUPABASE_URL?: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    readonly NEXT_PUBLIC_APP_URL?: string;

    // -- Server only --
    readonly SUPABASE_SERVICE_ROLE_KEY?: string;
    readonly GITHUB_CLIENT_ID?: string;
    readonly GITHUB_CLIENT_SECRET?: string;
    readonly GITHUB_WEBHOOK_SECRET?: string;
    readonly STRIPE_SECRET_KEY?: string;
    readonly STRIPE_WEBHOOK_SECRET?: string;
    readonly STRIPE_PRO_PRICE_ID?: string;
    readonly OPENAI_API_KEY?: string;

    // -- Tooling --
    /** Postgres connection string used by `bun run seed` (Supabase pooler). */
    readonly DATABASE_URL?: string;
  }
}