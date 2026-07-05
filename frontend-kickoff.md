# frontend-kickoff.md

> **Paste this whole file into a fresh chat to kick off the frontend repo `fleet-taxi-dashboard-web`.**
> It is self-contained, but a **companion `PROJECT-BRIEF.md` lives in the repo root** and is the single source of truth for scope, DB schema, the REST API contract (§6), the realtime event catalog (§4), and conventions (§7). **Read `PROJECT-BRIEF.md` first. If anything here conflicts with it, `PROJECT-BRIEF.md` wins** — and fix this file to match.

---

## Section 0 — Paste this to start (mission statement)

You are the frontend engineer for **`fleet-taxi-dashboard-web`**, the **frontend half of a two-repo project** (the other repo, `fleet-taxi-dashboard-api`, is a NestJS backend built in a separate chat). This is a **parallel modern rebuild** of a subset of a legacy Laravel 5.6 + CRUDBooster app — the legacy app keeps running; we are not migrating it.

**What you are building:** a **React 19 + Vite + TypeScript single-page app**, served at **`app.fleet-taxi.id`**, talking to **`api.fleet-taxi.id`** over HTTPS. Humans authenticate with an **HTTP-only cookie session** (no token in JS); because the SPA and API are on **different subdomains of `fleet-taxi.id`**, every request is sent with **`credentials: 'include'`** and the backend runs CORS with an explicit origin allowlist + `credentials: true`.

**R1 scope = exactly two features** (nothing else from the legacy app — no drivers/wallets/PPOB/hotel-CMS/blog):

1. **Admin Fleet Monitoring** — a monthly **deposit/earnings reconciliation grid** for two platforms:
   - **`/admin/fleet-monitoring`** (Gojek)
   - **`/admin/fleet-monitoring-grab`** (Grab)
   An admin uploads a CSV/XLSX exported from the Gojek/Grab partner portal; the backend parses it asynchronously and stores rows; the dashboard renders a **per-vehicle 31-day pivot grid** with threshold color-coding, cell-click day breakdown, multi-select filters, and top/bottom performers.
2. **Partner Portal** — a small role-based portal at **`/partner/…`**: login, dashboard, own-orders list/detail, PDF/Excel export. A partner sees **only its own data** (server-enforced per-partner scoping).

> ### ⚠️ WARNING 1 — This is NOT realtime GPS.
> Despite the words "fleet monitoring," there is **no live map and no GPS in R1**. The grid is a **monthly reconciliation pivot** built from uploaded spreadsheets. **Do not build a live map, do not add MapLibre, do not open a WebSocket GPS stream.** Maps/GPS/PostGIS are explicitly deferred to **R2**. The only realtime in R1 is **import-progress events** (Socket.IO, see §6).

> ### ⚠️ WARNING 2 — The 31-day grid is the single hardest piece.
> A sticky-header + sticky-identity-column, virtualized, threshold-colored, click-to-drill pivot over up to **500 vehicles × 31 days + summary columns** is where the real engineering is. **Budget your time accordingly.** Prove it on mocks early (milestone M2) before anything else feels "done." Everything else (auth shell, partner portal) is comparatively cheap.

**Do NOT invent endpoints or business math.** The endpoint set is frozen in `PROJECT-BRIEF.md` §6; the money/target/outstanding logic is computed **server-side** and you only display it. When in doubt, read the brief.

---

## Section 1 — First actions

Do these in order before writing feature code.

1. **Read `PROJECT-BRIEF.md` in the repo root, cover to cover.** Internalize §2 (scope), §5 (schema — you consume it as JSON, don't rebuild it), §6 (the REST contract — the only endpoints that exist), §4 (auth model + realtime event catalog), §7 (conventions: camelCase JSON, integer rupiah, Asia/Jakarta bucketing, plate normalization).

2. **OPEN QUESTION #1 is already RESOLVED — do not re-investigate.**
   The brief's OPEN QUESTION #1 asked for the full partner screen inventory. It was resolved by exploring the legacy app `D:\WORKS\EVISTA\evista-backend`:
   > In `cms_menus_privileges`, privilege id **12 ("Partner")** is assigned **only TWO menu rows**: menu **257 ("All Dashboard")** — a `#` grouping parent with no controller — and menu **209 ("Dashboard")** → `AdminDashboardController@getMaindashboard`.
   > **Conclusion:** the legacy partner portal is just a **single generic dashboard gated by an `is_partner` flag**. There is **no rich legacy portal to port.**
   Therefore the partner portal screen set is **designed FRESH from the REST contract** in `PROJECT-BRIEF.md` **§6.2** — login, logout, me, dashboard, orders list, order detail, orders export — **not ported** from legacy. Build exactly those screens; do not go hunting for more legacy partner pages, there aren't any.

3. **Assume the backend may not be ready yet — generate a typed client + mock everything.**
   The backend is the single source of API truth and exposes an **OpenAPI 3** schema (`@nestjs/swagger`) at **`/docs`** (JSON at **`/docs-json`**). You will **generate a fully typed client** from that schema so you get end-to-end types **without a shared npm package**.
   - **Recommended:** [`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript) (generates a `paths` type) + [`openapi-fetch`](https://github.com/openapi-ts/openapi-typescript/tree/main/packages/openapi-fetch) (a tiny, fully-typed fetch wrapper). **Alternative:** [`orval`](https://orval.dev/) if you prefer generated React-Query hooks — but hand-wiring Query on top of `openapi-fetch` keeps you in full control of the envelope unwrap and cache keys, which matters for the grid.
   - **Commit a snapshot** `openapi.json` in the repo (fetched from `api.fleet-taxi.id/docs-json`, or a hand-maintained stub matching §6 until the backend publishes one) and add a **`pnpm gen:api`** script that regenerates `src/lib/api-client/schema.d.ts` from it.
   - Until the real API responds, run against **[MSW](https://mswjs.io/) mocks** that return the **§6 shapes wrapped in the standard envelope** (§6 "Standard JSON envelope"). MSW is the *single* mock layer shared by dev-run and tests (§9).

   Progression you'll follow: **generate types → develop against MSW → flip `VITE_USE_MSW=false` and wire to the real API.**

---

## Section 2 — Vite + React + TS setup

Scaffold with Vite (`pnpm create vite@latest fleet-taxi-dashboard-web -- --template react-ts`), Node 22 LTS, **pnpm**. Install in these groups:

**Core**
```
react@^19  react-dom@^19
vite  @vitejs/plugin-react
typescript
```

**Styling — Tailwind + shadcn/ui + Radix**
```
tailwindcss  postcss  autoprefixer
class-variance-authority  clsx  tailwind-merge
lucide-react
# shadcn/ui: init via `pnpm dlx shadcn@latest init`, add components as needed.
# shadcn pulls in @radix-ui/* primitives (dialog, popover, dropdown-menu, checkbox…) on demand.
```

**The grid (the hard part) — TanStack headless table + virtualizer**
```
@tanstack/react-table    # v8, headless — we render our own sticky/pinned DOM
@tanstack/react-virtual  # row virtualization over up to 500 vehicles
```

**Data layer — Query + generated OpenAPI client**
```
@tanstack/react-query
openapi-fetch
-D openapi-typescript     # dev-only: powers `pnpm gen:api`
```

**Routing — TanStack Router (recommended) *or* React Router**
```
@tanstack/react-router  @tanstack/router-plugin  @tanstack/router-devtools
# alternative: react-router@^7
```
> **Recommendation: TanStack Router.** The grid's entire state (month, year, `rentalPartner[]`, `plate`, and a deep-linkable `cell`) lives in **URL search params**, and TanStack Router gives **typed, zod-validated search params** per route — so `/admin/fleet-monitoring?month=7&year=2026&rentalPartner=BHISA&cell=B1234XYZ:14` is fully typed, validated, and shareable, and the same params key the Query cache directly. React Router works but you'd validate search params by hand.

**Forms + validation**
```
react-hook-form  zod  @hookform/resolvers
```

**Charts (partner dashboard)**
```
recharts
```

**Realtime (import progress only — NOT GPS)**
```
socket.io-client
```

**Testing + mocks**
```
-D vitest  @testing-library/react  @testing-library/user-event  @testing-library/jest-dom  jsdom
-D msw
```

### Refine.dev — OPTIONAL accelerator, **do NOT adopt in R1**
Refine can scaffold admin CRUD + RBAC quickly. **Recommendation: skip it in R1.**
- The **31-day grid gains nothing** from Refine — it's a bespoke virtualized/pinned pivot, not a standard CRUD table, so Refine's data-grid conventions would fight you.
- The **partner portal is tiny** (7 endpoints, §6.2) and cheaper to hand-build with Query + RHF than to wire through Refine's data-provider abstraction.
- Adding Refine now means a heavier dependency, a data-provider layer, and its opinions layered on top of everything else.
**Revisit Refine in R2** if the admin surface grows a lot of uniform CRUD screens.

---

## Section 3 — Folder structure

```
fleet-taxi-dashboard-web/
├─ PROJECT-BRIEF.md              # byte-identical copy of the shared contract (keep in sync!)
├─ openapi.json                  # committed OpenAPI snapshot → source for gen:api
├─ package.json                  # scripts: dev, build, test, gen:api, lint
├─ vite.config.ts                # dev proxy for /api and /rt (ws)
├─ .env.example
└─ src/
   ├─ main.tsx
   ├─ app.tsx                    # providers: QueryClientProvider, RouterProvider
   ├─ routes/                    # route tree (TanStack Router) or route modules
   │  ├─ __root.tsx
   │  ├─ partner.login.tsx       # public
   │  ├─ admin.fleet-monitoring.tsx        # Gojek grid  (RoleGuard admin/super_admin)
   │  ├─ admin.fleet-monitoring-grab.tsx   # Grab grid   (RoleGuard admin/super_admin)
   │  ├─ partner.dashboard.tsx
   │  ├─ partner.orders.tsx
   │  └─ partner.orders.$orderId.tsx
   ├─ features/
   │  ├─ fleet/                  # shared Gojek/Grab grid engine
   │  │  ├─ components/          # VirtualizedPinnedGrid, DayCell, CellModal, FilterBar, PerformerPanel
   │  │  ├─ lib/thresholds.ts    # PURE cellTone()/toneClass() — unit-tested
   │  │  ├─ hooks/               # useFleetGridQuery, useCellQuery
   │  │  └─ types.ts             # FleetRow, GrabRow, DayCellValue, GridSummary
   │  ├─ grab/                   # Grab-specific column defs / summary mapping on top of fleet/
   │  ├─ partner/               # portal: dashboard, orders list/detail, export triggers
   │  └─ auth/                   # login form, session hooks, RequireAuth, RoleGuard
   ├─ components/
   │  ├─ ui/                     # shadcn/ui generated primitives
   │  └─ shared/                 # AppShell, Sidebar, DataTable helpers, ErrorState, EmptyState
   ├─ lib/
   │  ├─ api-client/             # schema.d.ts (generated) + client.ts (openapi-fetch + envelope unwrap)
   │  ├─ query-client/           # queryClient config + qk (query-key factory)
   │  ├─ socket/                 # socket.io-client singleton + useImportProgress hook
   │  ├─ auth/                   # session context, login/logout mutations
   │  ├─ money/                  # rupiah formatting (integer in → "Rp1.234.567")
   │  ├─ datetime/               # Asia/Jakarta helpers (display + day/period bucketing)
   │  └─ env/                    # zod-validated import.meta.env
   ├─ hooks/                     # cross-cutting hooks (useDebouncedValue, useMediaQuery…)
   ├─ mocks/                     # MSW: handlers.ts, browser.ts, server.ts, fixtures/
   └─ test/                      # setup.ts (jest-dom + MSW server), test utils
```

---

## Section 4 — Routing map

All routes below map to `PROJECT-BRIEF.md` §6. Guards are **UX only** — the **backend enforces real authorization**; a guard just avoids showing a screen the user can't use.

| Route | Access | Notes |
|---|---|---|
| `/partner/login` | **public** | Partner portal login form → `POST /partner/portal/login` sets the session cookie. |
| `/admin/fleet-monitoring` | guard: **admin / super_admin** | Gojek 31-day grid. Typed search params (below). |
| `/admin/fleet-monitoring-grab` | guard: **admin / super_admin** | Grab 31-day grid. Same search-param shape (+ Grab summary columns). |
| `/partner` | guard: **partner** | Redirect to `/partner/dashboard`. |
| `/partner/dashboard` | guard: **partner** | Metrics/summary widgets (`GET /partner/portal/dashboard`). |
| `/partner/orders` | guard: **partner** | Own orders, paginated (`GET /partner/portal/orders`). |
| `/partner/orders/:orderId` | guard: **partner** | One own order (`GET /partner/portal/orders/:id`). |

**Typed search params for the fleet grids** (validate with zod at the route boundary):
```ts
const fleetSearchSchema = z.object({
  month: z.number().int().min(1).max(12).catch(currentMonthWIB()),
  year:  z.number().int().min(2020).max(2100).catch(currentYearWIB()),
  rentalPartner: z.array(z.string()).catch([]),   // multi-select
  plate: z.string().optional(),
  cell:  z.string().optional(),                    // "<plateNorm|compositeKey>:<day>" → deep-linkable day modal
});
```
Changing a filter **updates the URL**, which drives the Query key (§8). The `cell` param makes the day-breakdown modal **deep-linkable and back-button friendly**.

**Guards:**
- `RequireAuth` — reads session from `GET /partner/portal/me` (partner) / an admin `me` equivalent; if unauthenticated, redirect to the appropriate login.
- `RoleGuard roles={['admin','super_admin']}` (or `['partner']`) — renders children only if the session role matches; otherwise a 403 screen.
- **Never send a client-chosen `partnerId`.** The partner is derived **server-side** from the session. Per-partner scoping is server-enforced; the client just calls `/partner/portal/*` and trusts the backend to scope rows.

---

## Section 5 — THE 31-DAY GRID (hardest piece)

This is the make-or-break component. Build a **shared engine** and specialize per platform.

### Client data model (display-only — see the "do not recompute money" rule)
```ts
// Gojek
type DayCellValue = {
  day: number;                 // 1..31 (Asia/Jakarta calendar day)
  amount: number;              // integer rupiah, backend-computed
  hasManualUncounted?: boolean;
  hasException?: boolean;      // rental/maintenance/free-day marker
};
type FleetRow = {
  plateNorm: string;           // join/pivot key (backend-normalized [A-Z0-9])
  plateRaw: string;
  driverName: string;
  rentalPartner?: string;
  days: Record<number, DayCellValue | undefined>;   // sparse map keyed by day
  summary: {
    dailyTarget: number;       // backend-computed (fleet_target | round(total_due/due_count) | 488000)
    monthlyTarget: number;     // backend-computed (dailyTarget × targetDays)
    totalDeduction: number;
    outstanding: number;       // the headline all-time number — backend-computed
  };
};

// Grab — pivot key is composite plate|city|driver
type GrabRow = {
  compositeKey: string;        // "plate|city|driver"
  plateNumber: string;
  city: string;
  driverName: string;
  days: Record<number, { earning: number } | undefined>;   // total_earning_collected per day
  summary: {                   // backend-aggregated
    earning: number; incentive: number; driverFare: number;
    rides: number; onlineHours: number; bookings: number;
    cancellations: number; fulfillmentRate: number;
  };
};
```

### Rendering strategy
- **TanStack Table (v8, headless)** for column/row model, filtering hooks, and column pinning metadata — but **you render the DOM yourself** (a plain CSS-grid / table with your own sticky styling). Headless is the point: the visual is too custom for a prebuilt data grid.
- **TanStack Virtual** for **row virtualization** — up to ~500 vehicles. Virtualize rows; the ~34 columns (31 days + a handful of summary + identity) are few enough to render eagerly. (If Grab summary widens columns a lot, you may window columns too, but start rows-only.)
- **Sticky identity columns via column pinning:** pin the left identity columns (plate, driver, rental partner) with `position: sticky; left: …`. Keep the **header sticky** at the top. The **top-left corner cell** (intersection of sticky header × sticky columns) needs a **higher `z-index`** than either, or it'll be overlapped on scroll.
- **Fixed-width day columns** (e.g. 44–56px) so 31 columns line up predictably and the virtualizer math is stable. Identity columns get their own fixed widths.
- Build a single **`VirtualizedPinnedGrid`** primitive in `features/fleet/components/` that both Gojek and Grab consume; pass it column defs + a row renderer. This is the shared piece; Gojek vs Grab differ only in **column defs + summary mapping + cell value extraction**.

### Threshold color-coding — a PURE, tested function
Put it in `features/fleet/lib/thresholds.ts`, no React, no I/O:
```ts
export type CellTone = 'empty' | 'below' | 'met' | 'exceeded' | 'exception';
export function cellTone(amount: number | undefined, dailyTarget: number, opts?: {
  hasException?: boolean; hasManualUncounted?: boolean;
}): CellTone { /* pure comparison vs dailyTarget */ }
export function toneClass(tone: CellTone): string { /* → Tailwind class */ }
```
Unit-test `cellTone` exhaustively (below target, exactly at, above, empty day, exception day, uncounted-manual day). Color is **derived from backend numbers**, never from client math.

### Cell click → deep-linkable modal
- Clicking a day cell sets the `cell` search param (`"<plateNorm|compositeKey>:<day>"`) → opens a modal (shadcn `Dialog`) that **lazy-fetches** the breakdown from `GET /admin/fleet/gojek/cell` (or `/grab/cell`) with `?plate/composite&day&month&year`.
- Because the modal state is a URL param, it's **shareable and survives refresh/back**.

### Filters, performers
- **Multi-select filters** (rental partner, plate, month/year) write to the **URL search params** → which form the **Query key** → which drive the grid fetch (`GET /admin/fleet/{platform}/grid`). No client-side row filtering of a giant dataset; the server returns the filtered pivot.
- **Top / bottom performer panels** read `GET /admin/fleet/{platform}/performers` for the period and render alongside the grid.

### 🚫 The money rule (repeat until reflexive)
**Do NOT recompute money on the client.** The backend already computes `dailyTarget`, `monthlyTarget`, `outstanding`, and every daily/summary total using the exact legacy logic (inferred daily target, `targetDays`, all-time outstanding, counted vs uncounted manual payments — see `PROJECT-BRIEF.md` §2.A and §5). The frontend **only displays and color-codes** those numbers. Never sum, prorate, or re-derive a rupiah figure in the browser.

---

## Section 6 — Import upload UI

The upload → async parse → progress flow (both platforms; `{platform} ∈ gojek | grab`):

1. **File picker** accepting `.csv/.xlsx` + a **period selector (month 1..12, year)**.
2. Submit → **`POST /admin/fleet/{platform}/imports`** as **`multipart/form-data`** (file + month + year). Response returns an **`importId`** (the batch is created, rows parse **asynchronously** in a queued job).
3. **Async progress via Socket.IO** on namespace **`/rt`** (join the per-import room). Event catalog is fixed in `PROJECT-BRIEF.md` §4:

   | Event | Payload | UI action |
   |---|---|---|
   | `import:progress` | `{ importId, processed, total, percent }` | Update a progress bar; show "N of M rows". |
   | `import:done` | `{ importId, rowsInserted, durationMs }` | Mark done; **invalidate** the imports-list + grid queries so fresh data loads. |
   | `import:failed` | `{ importId, error }` | Show the error; note the **batch was rolled back**. |

   **HTTP poll fallback:** if the socket isn't connected, poll **`GET /admin/fleet/{platform}/imports/:id`** for status/progress.
4. **Import list** (`GET /admin/fleet/{platform}/imports`) — filename, period, status, row counts.
5. **Rollback** — **`DELETE /admin/fleet/{platform}/imports/:id`** behind a **destructive confirm dialog** ("This permanently removes all rows from this batch"). It's a queued operation; reflect status and invalidate the grid on completion.

> These four `import:*` are the **only** realtime events in R1. No GPS stream (Warning 1).

---

## Section 7 — Partner portal UI

Designed **fresh from `PROJECT-BRIEF.md` §6.2** (OPEN QUESTION #1 confirmed there is no rich legacy portal to port — §1 step 2). Screens:

- **Login** (`/partner/login`, public) — email + password form (RHF + zod) → **`POST /partner/portal/login`** (sets the HTTP-only session cookie). On success, route to `/partner/dashboard`. Errors render from the standard error envelope.
- **Logout** — **`POST /partner/portal/logout`**, then clear cached session and redirect to login.
- **Dashboard** (`/partner/dashboard`) — metrics/summary widgets from **`GET /partner/portal/dashboard`**, visualized with **Recharts** (a couple of small cards + one or two charts). Keep it light.
- **Orders list** (`/partner/orders`) — **`GET /partner/portal/orders`**, **paginated** (read `meta.page/pageSize/total` from the envelope), filterable. Table of own orders.
- **Order detail** (`/partner/orders/:orderId`) — **`GET /partner/portal/orders/:id`**.
- **Export** — trigger **`GET /partner/portal/orders/export?format=pdf|xlsx`**; the **server generates the file** (backend uses ExcelJS / @react-pdf). The frontend just triggers the download (open the URL / fetch the blob). **Do NOT build client-side PDF generation in R1.**

**Per-partner scoping is server-enforced.** All `/partner/portal/*` calls are scoped by the session's partner on the backend — never pass a `partnerId` from the client, never let the UI imply cross-partner access.

---

## Section 8 — Data & auth layer

### Generated typed client + envelope unwrap
```ts
// src/lib/api-client/client.ts
import createClient from 'openapi-fetch';
import type { paths } from './schema';           // generated by `pnpm gen:api`
import { env } from '@/lib/env';

export const api = createClient<paths>({
  baseUrl: env.VITE_API_BASE_URL,
  credentials: 'include',                          // send the cookie cross-subdomain
});

// Universal envelope (PROJECT-BRIEF.md §6):
//   success: { success: true, data, meta? }
//   error:   { success: false, error: { code, message, details? } }
export function unwrap<T>(res: { success: true; data: T; meta?: Meta } | { success: false; error: ApiError }): T {
  if (res.success) return res.data;
  throw new ApiErrorException(res.error);          // carries code/message/details for the UI
}
```

### TanStack Query + a query-key factory
```ts
// src/lib/query-client/qk.ts  — one factory, no ad-hoc key strings anywhere
export const qk = {
  session: ['session'] as const,

  fleet: {
    grid:  (p: { platform: 'gojek'|'grab'; month: number; year: number; rentalPartner: string[]; plate?: string }) =>
      ['fleet', p.platform, 'grid', p] as const,
    cell:  (p: { platform: 'gojek'|'grab'; key: string; day: number; month: number; year: number }) =>
      ['fleet', p.platform, 'cell', p] as const,
    imports:      (platform: 'gojek'|'grab') => ['fleet', platform, 'imports'] as const,
    importStatus: (platform: 'gojek'|'grab', id: string) => ['fleet', platform, 'imports', id] as const,
    performers:   (p: { platform: 'gojek'|'grab'; month: number; year: number }) =>
      ['fleet', p.platform, 'performers', p] as const,
  },

  partner: {
    me:       ['partner', 'me'] as const,
    dashboard:['partner', 'dashboard'] as const,
    orders:   (p: { page: number; pageSize: number }) => ['partner', 'orders', p] as const,
    order:    (id: string) => ['partner', 'order', id] as const,
  },
} as const;
```
The grid's search params flow straight into `qk.fleet.grid(...)`, so URL ↔ cache stay in lockstep.

### Cookie-session login flow + CORS
- Login is a `POST` that **sets an HTTP-only, Secure, SameSite=None cookie** with `Domain=.fleet-taxi.id`; the SPA holds **no token in JS**.
- Every request uses `credentials: 'include'`; the backend allowlists `https://app.fleet-taxi.id` with `credentials: true`. Locally the **Vite dev proxy** (§9) makes cookies/CORS a non-issue.
- After login, invalidate/refetch `qk.session` (or `qk.partner.me`) to hydrate the session context that guards read.

### socket.io-client hook that patches the Query cache
```ts
// src/lib/socket/useImportProgress.ts
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query-client/qk';
import { env } from '@/lib/env';

export function useImportProgress(platform: 'gojek'|'grab', importId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = io(env.VITE_WS_URL, { withCredentials: true, transports: ['websocket'] });
    socket.emit('join', { importId });

    socket.on('import:progress', (p) =>
      qc.setQueryData(qk.fleet.importStatus(platform, importId), (old: any) => ({ ...old, ...p })));
    socket.on('import:done', () => {
      qc.invalidateQueries({ queryKey: qk.fleet.imports(platform) });
      qc.invalidateQueries({ queryKey: ['fleet', platform, 'grid'] }); // refresh the pivot
    });
    socket.on('import:failed', (p) =>
      qc.setQueryData(qk.fleet.importStatus(platform, importId), (old: any) => ({ ...old, status: 'failed', error: p.error })));

    return () => { socket.disconnect(); };
  }, [platform, importId, qc]);
}
```
`VITE_WS_URL` is `wss://api.fleet-taxi.id/rt` in prod (§9). The socket **patches the cache**; components just read Query state.

---

## Section 9 — Env vars, local dev, testing, working before the backend exists

### Environment variables (Vite `VITE_`-prefixed, zod-validated)
Per `PROJECT-BRIEF.md` §7 (frontend block) + a couple of dev toggles:
```
VITE_API_BASE_URL   # https://api.fleet-taxi.id
VITE_WS_URL         # wss://api.fleet-taxi.id/rt
VITE_APP_ENV        # local | staging | production
VITE_USE_MSW        # "true" to serve the app from MSW mocks (dev-only toggle)
```
Validate them once at startup:
```ts
// src/lib/env/index.ts
import { z } from 'zod';
export const env = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_WS_URL: z.string().url(),
  VITE_APP_ENV: z.enum(['local','staging','production']).default('local'),
  VITE_USE_MSW: z.enum(['true','false']).default('false'),
}).parse(import.meta.env);
```

### Vite dev proxy (so cookies/CORS "just work" locally)
Proxy `/api` and the `/rt` websocket to the backend, so the browser sees a same-origin dev server and cookies flow without cross-subdomain CORS gymnastics:
```ts
// vite.config.ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:3000', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
    '/rt':  { target: 'http://localhost:3000', ws: true, changeOrigin: true },
  },
},
```
(In dev, point `VITE_API_BASE_URL=/api` and `VITE_WS_URL=/rt` so the proxy handles it.)

### Testing — one shared mock layer
- **Vitest + @testing-library/react + user-event**, `jsdom` environment.
- **MSW is the single mock layer** used by both the dev server (when `VITE_USE_MSW=true`) and tests (`src/mocks/server.ts` in `src/test/setup.ts`). Handlers return the **§6 shapes inside the standard envelope**. Fixtures live in `src/mocks/fixtures/` (a realistic ~200-vehicle Gojek pivot + a Grab composite-key set to stress the grid).
- **Priority tests:** `cellTone`/`toneClass` (exhaustive, pure); the envelope `unwrap`; the grid renders sticky header/pinned columns and virtualizes; filters ⇄ URL ⇄ query key; the import-progress socket hook patches the cache.

### Working before the backend exists (the progression)
1. **Generate types** — `pnpm gen:api` from the committed `openapi.json` (a stub matching §6 until the backend publishes its real `/docs-json`).
2. **Run on MSW** — `VITE_USE_MSW=true pnpm dev`; build every screen and the whole grid against realistic mock fixtures. This is where M2–M4 happen.
3. **Wire to the real API** — set `VITE_USE_MSW=false`, regenerate types from the live schema, and adapt any drift. Contract changes always land in the backend first (updated Swagger), then you regen.

---

## Section 10 — Milestone roadmap (M0..M5)

| Milestone | Goal |
|---|---|
| **M0 — Setup & tooling** | Vite + React 19 + TS scaffold; Tailwind + shadcn/ui; pnpm scripts (`dev/build/test/gen:api/lint`); commit `openapi.json` + generate `schema.d.ts`; MSW wired for dev + tests; Vite dev proxy; env zod-validation; copy `PROJECT-BRIEF.md` into the repo. |
| **M1 — Auth + shell + guards** | `AppShell` (sidebar/topbar), `RequireAuth` + `RoleGuard`, session context from `me`, partner login page, cookie-session flow end to end (on MSW). |
| **M2 — Gojek 31-day grid on mocks** | **Prove the hardest piece.** `VirtualizedPinnedGrid`: sticky header + pinned identity columns + high-z corner, row virtualization over ~500 vehicles, fixed-width day columns, pure `cellTone` coloring, deep-linkable cell modal, URL-driven multi-select filters, top/bottom performer panels — all on MSW fixtures. |
| **M3 — Grab grid + imports + exceptions/targets** | Grab grid reusing the shared primitive (composite key + Grab summary columns); import upload UI with **real Socket.IO `import:*` progress** + HTTP poll fallback; import list + destructive rollback; Gojek exception calendar; edit driver/target metadata (`GET/PUT …/targets/:plate`). |
| **M4 — Partner portal** | Login, dashboard (Recharts), own-orders list (paginated) + detail, PDF/Excel **export triggers** (server-generated). |
| **M5 — Real API + harden + deploy** | Flip `VITE_USE_MSW=false`, regen types from live `/docs-json`, fix drift; error/empty/loading states, a11y pass, perf-check the grid at 500×31; deploy static build to **`app.fleet-taxi.id`** (**S3 + CloudFront**, behind **Cloudflare**). **GPS/maps explicitly deferred to R2 — not in scope.** |

---

## Section 11 — Guardrails (non-negotiable)

- **Integer rupiah only.** Money is `bigint`/integer rupiah end to end (`PROJECT-BRIEF.md` §7). **No floats, no decimals** for money in the browser. Format for display only (`lib/money`). Ratios/rates (fulfillment, cancellation, online hours) may be `numeric` — those are the only non-integers.
- **Asia/Jakarta timezone.** Timestamps arrive UTC; **convert to `Asia/Jakarta` (WIB, UTC+7) only at display and when bucketing a transaction into a day/period** (day-of-month and period month/year derive from the Jakarta-local date). Do the conversion in `lib/datetime`, nowhere else.
- **Do NOT invent endpoints.** The **only** endpoint set is `PROJECT-BRIEF.md` **§6**, consumed through the **generated OpenAPI client**. No hand-rolled URLs, no "just add a quick endpoint." Contract changes land in the backend first.
- **camelCase JSON + universal envelope.** API JSON fields are **camelCase**; every response is the standard envelope (`{success,data,meta}` / `{success,error}`). Always go through `unwrap`.
- **Cookie session — the SPA holds no token.** Humans auth via HTTP-only cookie; you never read/store a token in JS. `credentials:'include'` on every call.
- **The external `/partner/v1` bearer-key API is backend-only.** It's a machine-to-machine surface (`/partner/v1/pricelist`, `/partner/v1/orders …`) secured by per-partner hashed API keys and rate-limited. **The frontend never calls it.** The frontend's partner surface is **only** `/partner/portal/*` (§6.2).
- **Per-partner scoping is server-enforced.** Never send a client-chosen `partnerId`; the backend derives the partner from the session and row-scopes everything. Guards are UX only.
- **NOT realtime GPS.** Socket.IO is used **only** for the `import:*` events (§4/§6). No live map, no GPS stream, no MapLibre in R1.
- **Plate normalization is the backend's join key.** Plates are normalized server-side (`UPPERCASE`, strip non-`[A-Z0-9]`). Use the `_norm` value the API returns as the grid/pivot key; **do not re-normalize or re-join plates on the client.**
- **Keep `PROJECT-BRIEF.md` byte-identical across both repos.** It's the shared contract. If something needs to change, change the brief first, then both repos — do not fork a per-repo copy.

---

*End of frontend-kickoff.md — companion to PROJECT-BRIEF.md (the source of truth). If they disagree, the brief wins.*
