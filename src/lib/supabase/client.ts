import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (anon key). Safe to call from `"use client"`
 * components only. RLS keeps the client on the user's own rows — the
 * GitHub token lives in `github_tokens`, which has no client policies,
 * so it is never reachable from here.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  return createBrowserClient(url, anonKey);
}