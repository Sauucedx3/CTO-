import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Sign the user out (clear Supabase session cookies) and go to /dashboard. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    // Missing/dummy env — nothing to sign out of; still redirect.
    console.error("[auth/signout] signOut failed", err);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return NextResponse.redirect(
    appUrl ? new URL("/dashboard", appUrl) : new URL("/dashboard", request.url),
  );
}