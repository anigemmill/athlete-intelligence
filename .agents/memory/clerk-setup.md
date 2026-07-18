---
name: Clerk canonical setup
description: Correct Clerk wiring for react-vite apps with wouter; deviations cause prod breaks
---
- `publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)` — never the raw env var
- `proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL}` must be unconditional (empty in dev is intentional)
- Wouter routes MUST be `path="/sign-in/*?"` — the /*? optional wildcard matches OAuth callback sub-paths
- `<SignIn routing="path" path={`${basePath}/sign-in`} />` — basePath must be in the path prop
- `vite.config.ts` needs `tailwindcss({ optimize: false })` to prevent Clerk CSS layer reorder in prod
- `routerPush`/`routerReplace` must strip basePath before calling wouter's setLocation
**Why:** Without publishableKeyFromHost the build won't work across Clerk custom domains. Without proxyUrl the prod proxy breaks. Without /*? OAuth callback sub-paths 404.
