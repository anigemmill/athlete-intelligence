---
name: OpenAPI Orval query-param TS2308 collision
description: Orval generates Params type for query params; causes TS2308 if name collides between api.ts and types/
---
Orval emits `<OperationIdPascal>Params` as a Zod schema in api.ts AND as a TS interface in types/. The api-zod barrel re-exports both with `export *` — collision → TS2308.
This is the same mechanism as the Body collision but for query parameters.
**Fix:** Remove the query params from the conflicting endpoints in openapi.yaml; filter client-side instead.
