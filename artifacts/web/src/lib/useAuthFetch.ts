/**
 * useAuthFetch — drop-in replacement for bare fetch("/api/...") calls.
 *
 * Attaches Authorization: Bearer via the same module-level getter registered
 * by ClerkAuthSync in App.tsx, so token injection is consistent with the
 * generated react-query hooks.
 */
import { getAuthToken } from "./getAuthToken";

export function useAuthFetch() {
  return async function authFetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
  ): Promise<Response> {
    const token = await getAuthToken();
    const headers = new Headers(init.headers);
    if (token && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
  };
}
