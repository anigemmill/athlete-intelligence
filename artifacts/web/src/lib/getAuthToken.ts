/**
 * Module-level token getter shared between ClerkAuthSync (App.tsx) and
 * useAuthFetch.  This lets bare fetch() calls use the same Clerk JWT that
 * the generated react-query hooks use via setAuthTokenGetter.
 */
let _getter: (() => Promise<string | null>) | null = null;

export function registerTokenGetter(fn: (() => Promise<string | null>) | null): void {
  _getter = fn;
}

export async function getAuthToken(): Promise<string | null> {
  if (!_getter) return null;
  return _getter();
}
