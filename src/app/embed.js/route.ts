/**
 * GET /embed.js — the keyless embeddable "What's New" widget.
 *
 * Served as a route handler (not a file in `public/`) so the bytes can be
 * version-specific and cache-busted later, and so a Pro gate can be added
 * server-side without moving the URL.
 *
 * Usage on any site:
 *
 *   <script src="https://<host>/embed.js" data-workspace="acme"
 *           data-position="bottom-right" defer></script>
 *
 * `?workspace=acme` is accepted as a fallback for `data-workspace`.
 * The script is plain ES5-safe JavaScript with no dependencies, fetches the
 * anonymous public JSON from `/api/changelog/{workspace}` on the same origin it
 * was served from, and renders nothing at all if that request fails.
 *
 * The inline-proxied-widget case (a customer copies the script body into their
 * page) never sees this route, so all configuration must come from the script
 * tag attributes / query string — never from a response header.
 */
import { EMBED_SCRIPT, EMBED_VERSION } from "@/lib/embed/widget-script";

export const runtime = "nodejs";
// Static output, but the same route may later be gated per workspace, so it
// stays dynamic (and cheap: it is a constant string).
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(EMBED_SCRIPT, {
    status: 200,
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      // Long-lived is safe: the URL is version-bumped, and the widget itself
      // only ever fetches live data.
      "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "access-control-allow-origin": "*",
      "x-embed-version": EMBED_VERSION,
      "x-content-type-options": "nosniff",
    },
  });
}
