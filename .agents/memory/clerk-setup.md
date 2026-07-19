---
name: Clerk canonical setup
description: Correct Clerk wiring for react-vite apps with wouter; deviations cause prod breaks
---
- `publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)` — never the raw env var
- `proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL}` must be unconditional (empty in dev is intentional)
- Wouter routes MUST be `path="/sign-in/*?"` — the /*? optional wildcard matches OAuth callback sub-paths
- `<SignIn routing="path" path={`${basePath}/sign-in`} />` — basePath must be in the path prop
- `vite.config.ts` MUST keep `tailwindcss({ optimize: false })` — removing it causes Clerk CSS layer reorder in production builds. Do NOT treat this as a dead flag.
- `routerPush`/`routerReplace` must strip basePath before calling wouter's setLocation
- Clerk v6 (`@clerk/react ^6`) renamed `afterSignInUrl` → `fallbackRedirectUrl` and `afterSignUpUrl` → `fallbackRedirectUrl`. The old props are silently ignored — sign-in completes but no redirect fires. Always use `fallbackRedirectUrl` (or `forceRedirectUrl`).
**Why:** Without publishableKeyFromHost the build won't work across Clerk custom domains. Without proxyUrl the prod proxy breaks. Without /*? OAuth callback sub-paths 404. Without fallbackRedirectUrl users complete auth but stay on /sign-in forever.
