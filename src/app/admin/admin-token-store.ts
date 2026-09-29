"use client";

/**
 * The admin token, held in `sessionStorage` and exposed to React through
 * `useSyncExternalStore`.
 *
 * Why a tiny store instead of `useState` + an effect: reading `sessionStorage`
 * during the first render would mismatch the server HTML, and writing state
 * from an effect trips the `react-hooks/set-state-in-effect` rule. An external
 * store is exactly what `useSyncExternalStore` is for — the snapshot is a
 * primitive string, so it is stable and cheap to compare.
 *
 * Lifecycle: the server snapshot is `undefined` ("not read yet"), the client
 * snapshot is the stored token or `null` ("no token"). After hydration React
 * re-renders with the real client snapshot, so an unlocked tab never flashes
 * the token gate and a locked one never flashes the console.
 */
const TOKEN_STORAGE_KEY = "changelogsync.admin.token";

const listeners = new Set<() => void>();

/** Client snapshot: the token in this tab, or `null` when signed out. */
export function readAdminToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // Safari private mode and friends — behave as "locked".
    return null;
  }
}

/** Server/hydration snapshot: "we have not looked yet". */
export function readServerAdminToken(): string | null | undefined {
  return undefined;
}

/** Persist (or clear) the token and wake every subscriber. */
export function writeAdminToken(token: string | null): void {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage unavailable: the in-memory subscription still updates the UI.
  }
  for (const listener of listeners) listener();
}

/** `useSyncExternalStore` subscribe callback. */
export function subscribeAdminToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
