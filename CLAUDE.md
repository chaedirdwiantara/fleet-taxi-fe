# fleet-taxi-dashboard-web (FE)

React 19 SPA · Vite 8 · TanStack Router/Query/Table/Virtual · Tailwind 4 (CSS-first) · shadcn/ui · MSW · pnpm. Two audiences in one app: admin console and partner portal. Prod: static build on Cloudflare Pages at `app.fleet-taxi.id`, API at `api.fleet-taxi.id`.

**PROJECT-BRIEF.md is the canonical contract**; `frontend-kickoff.md` is historical. `docs/DEPLOY.md` covers hosting (SPA fallback is the one hard requirement).

## Commands

```
pnpm dev        # vite :5173 — proxies /api and /rt to localhost:3000 (rewrite strips /api)
pnpm build      # tsc -b && vite build (this is also the typecheck)
pnpm test       # vitest run (jsdom; MSW server with onUnhandledRequest:'error')
pnpm lint       # eslint .
pnpm gen:api    # openapi-typescript openapi.json -o src/lib/api-client/schema.d.ts
```

Env (`src/lib/env`, zod-validated at startup — missing vars = blank page): `VITE_API_BASE_URL=/api`, `VITE_WS_URL=/rt`, `VITE_USE_MSW` is the **string** `'true' | 'false'` (`'true'` = full MSW mocks, no backend needed).

## Hard rules (contract-level — must match BE)

- **Envelope.** Every response is `{ success: true, data, meta? }` or `{ success: false, error }`. Unwrap only via `unwrap` / `unwrapWithMeta` from `src/lib/api-client/client.ts` (throws `ApiErrorException`); hook pattern is `const { data, error } = await api.GET(...)` → `if (error) throwEnvelope(error)` → `unwrap(data)`.
- **Money is integer rupiah.** `src/lib/money` only formats (`formatRupiah` etc., `id-ID`); it never computes amounts — all derived values come from the backend.
- **Time.** UTC on the wire; convert to WIB only in `src/lib/datetime` (`currentMonthWIB`, `formatDateTimeWIB`, …). No timezone math anywhere else.
- **Generated files — never hand-edit:** `src/lib/api-client/schema.d.ts` (from `pnpm gen:api`), `src/routeTree.gen.ts` (router plugin), `public/mockServiceWorker.js`. Contract changes land in the **backend first**; use the workspace `sync-api-contract` skill (or the local `gen-api-client` skill) to refresh types. `openapi.json` here starts as a hand-written stub (`0.1.0-stub`) — replace it with the real BE export before trusting types.
- **Auth is cookie-only** (HTTP-only session, `credentials: 'include'`); the SPA never holds a token, and the client never sends a data scope — partner scoping is server-side. Admin (`/admin/auth/*`) and partner (`/partner/portal/*`) are separate audiences that can coexist in one browser. `RequireAdmin`/`RequirePartner` are UX gates only; the backend is the real authz.

## Structure & conventions

- `src/routes/` — file-based TanStack Router, flat naming. `_admin.tsx` / `_partner.tsx` are pathless layouts wrapping `RequireAdmin|RequirePartner` + `AppShell`. Route files export a `Route` const. Router plugin must stay **before** the react plugin in `vite.config.ts`.
- `src/features/<domain>/` — feature owns its `hooks.ts`, `types.ts`, components, and colocated `*.test.tsx` (`auth`, `fleet`, `grab`, `partner`, `admin-users`).
- **Query keys come only from the `qk` factory** (`src/lib/query-client/qk.ts`) — no ad-hoc key arrays. QueryClient defaults: 30s staleTime, no retry on `ApiErrorException`, no refetch-on-focus.
- **Grid state lives in the URL.** Fleet search params are zod-validated with `.catch()` fallbacks (`features/fleet/searchSchema.ts`) and feed `qk.fleet.grid(search)` directly; cell deep-links use `<key>:<day>` via `parseCellParam`/`makeCellParam`. New grid state goes through the search schema, not component state.
- **MSW is the single mock layer** for dev (`VITE_USE_MSW='true'`) and tests. Handler paths start with `*` so they match both the dev proxy base and the absolute test base. Keep `src/mocks/handlers.ts` + `fixtures/*` in sync with contract changes or tests fail (`onUnhandledRequest: 'error'`). Envelope helpers `ok`/`err` live in handlers.
- Realtime: socket.io singleton on `/rt` (`src/lib/socket`), import-progress events only; `realtimeEnabled()` is false under MSW → callers poll instead.
- Styling: Tailwind 4 CSS-first — no `tailwind.config.js`; tokens in `src/index.css` (oklch, blue primary + slate neutrals, dark via `@custom-variant` + `ThemeProvider`). shadcn (`new-york`) in `src/components/ui/`; compose classes with `cn()` from `src/lib/utils`. Alias `@` → `src/`. **DESIGN-SYSTEM.md is binding** — tokens only (no inline hex), `text-xs` minimum, Form primitive for new forms, Prettier is the formatter (`pnpm format`).
- Tests: vitest config lives in `vite.config.ts`; setup in `src/test/setup.ts` (jest-dom, MSW lifecycle, ResizeObserver polyfill — jsdom lacks it for TanStack Virtual/Radix).

## Gotchas

- Blank page on boot usually means env zod validation threw — check `.env.local` exists with all `VITE_*` vars.
- Dev cookies flow because the Vite proxy makes everything same-origin; in prod it's cross-subdomain (`SameSite=None; Domain=.fleet-taxi.id`) — don't bypass the proxy in dev.
- `unwrap(data) as SomeType` casts are intentional (schema loosened for MSW compat) — don't "fix" them away.
- All `VITE_*` values are public/inlined at build time; never put secrets there.
