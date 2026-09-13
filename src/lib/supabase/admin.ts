import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client (bypasses RLS). Server routes only —
 * NEVER import this from a client component or a `"use client"` file.
 * Used to provision auth users and to read `github_tokens`
 * (service-role-only table) on behalf of the signed-in user.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see .env.example).",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}