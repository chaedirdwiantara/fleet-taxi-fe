---
name: gen-api-client
description: Refresh the typed API client from the backend's OpenAPI schema. Use when FE types are stale or wrong, when `schema.d.ts` / `openapi.json` need regenerating, after any backend contract change, or when `openapi.json` is still the hand-written stub (`0.1.0-stub`). Covers fetching the live schema → `pnpm gen:api` → fixing call-site fallout → updating MSW mocks.
---

# Regenerate the typed API client (BE → FE contract)

The contract flows **backend first**: this repo's `openapi.json` must be a copy of the backend's exported schema, and `src/lib/api-client/schema.d.ts` is generated from it. **Never hand-edit `schema.d.ts`.**

> If `openapi.json` still says `version: 0.1.0-stub` / title ending in `(STUB)`, it's the hand-written placeholder — replace it with the real schema before trusting any types.

## Get the live schema (pick one)

1. **Sibling BE repo** (workspace layout `../BE`): `pnpm -C ../BE openapi:export`, then `cp ../BE/openapi.json ./openapi.json`.
2. **Running backend** (local dev, `SWAGGER_ENABLED=true`): `curl -s http://localhost:3000/docs-json -o openapi.json` (or the deployed `/docs-json` if Swagger is enabled there).

## Regenerate + fix fallout

1. ```
   pnpm gen:api
   ```
   Rewrites `src/lib/api-client/schema.d.ts` (generated, eslint-ignored).
2. Typecheck to surface breaking changes:
   ```
   pnpm build
   ```
   Fix fallout at call sites — usually `features/*/hooks*.ts` (the `api.GET/POST(...)` paths, params, and `unwrap(data) as T` casts) and the `qk` query-key factory (`src/lib/query-client/qk.ts`) if a route changed.
3. Update mocks if request/response shapes changed: `src/mocks/handlers.ts` + `src/mocks/fixtures/*`. Tests run MSW with `onUnhandledRequest: 'error'`, so drift fails loudly — `pnpm test`.

## Verify

- `pnpm build` and `pnpm test` clean.
- `git diff --stat openapi.json src/lib/api-client/schema.d.ts` shows the expected surface delta.
- Grep the new `schema.d.ts` for any endpoint you expected to land.

## Rules

- Commit `openapi.json` + `schema.d.ts` **together** so contract and client never drift in history.
- The generated types are intentionally loosened for MSW compatibility — keep the `unwrap(data) as SomeType` casts; don't try to "fix" them away.
- Contract changes land in the backend first; if you need a shape the BE doesn't emit yet, change the BE (it has a `contract.spec.ts` lock), then re-run this skill.
