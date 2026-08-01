import { QueryClient } from "@tanstack/react-query";

/**
 * Single app-wide React Query client.
 *
 * Exported (not created inline in App) so non-React code — the logout flow,
 * Axios 401 handlers — can clear it when the session ends. Without clearing,
 * a second user logging in on the same browser would see the previous user's
 * cached server data (e.g. their saved views).
 */
export const queryClient = new QueryClient();

/**
 * localStorage suffixes used by the table layer to persist per-list UI state.
 * These keys are NOT user-scoped, so they must be wiped when the session ends
 * to avoid one user inheriting another's column layout / grouping on the same
 * browser.
 */
const TABLE_STATE_SUFFIXES = [
  "-column-visibility",
  "-grouping",
  "-column-order",
  "-column-pinning",
  "-column-sizing",
];

/**
 * Reset all client-side caches tied to the authenticated user. Call on logout
 * (and whenever the auth session is force-cleared) so nothing leaks across
 * users/companies on a shared browser. DB-backed data (saved views, etc.) is
 * untouched — it is re-fetched, correctly scoped, for the next user.
 */
export function resetClientCaches(): void {
  try {
    queryClient.clear();
  } catch {
    // ignore — clearing cache must never block logout
  }
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (TABLE_STATE_SUFFIXES.some((suffix) => key.endsWith(suffix))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore storage errors
  }
}
