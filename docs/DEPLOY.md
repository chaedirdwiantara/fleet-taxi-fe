# Frontend deploy (fleet-taxi-dashboard-web)

The FE is a **static SPA** (Vite build → `dist/`). Any static host works; the only
special requirement is **SPA fallback routing** (serve `index.html` for unknown
paths — TanStack Router does client-side routing).

## 0. Prerequisites (backend must be up first)

- Backend deployed and reachable over **HTTPS** at `VITE_API_BASE_URL`
  (default `https://api.fleet-taxi.id`). See `../../BE/docs/RUNBOOK.md`.
- Backend **CORS** allowlist includes the app origin (e.g. `https://app.fleet-taxi.id`)
  with `credentials: true`.
- Session cookie issued with `Domain=.fleet-taxi.id`, `SameSite=None`, `Secure`
  so it flows cross-subdomain (app.* → api.*). (Already configured in the BE.)

## 1. Configure env

Production values live in `.env.production` (committed — `VITE_*` are public and
inlined into the bundle):

```
VITE_API_BASE_URL=https://api.fleet-taxi.id
VITE_WS_URL=wss://api.fleet-taxi.id/rt
VITE_APP_ENV=production
VITE_USE_MSW=false
```

Different domain? Edit `.env.production`, or override without committing via a
gitignored `.env.production.local`, or set the vars in your CI environment.

## 2. Build

```bash
pnpm install --frozen-lockfile
pnpm build          # tsc -b && vite build  → dist/
```

`vite build` runs in production mode and auto-loads `.env.production`. Output is
fully static under `dist/`. (The MSW mock worker chunk is present but never
started when `VITE_USE_MSW=false`.)

## 3. Publish `dist/` — pick one host

**Cloudflare Pages** (same CDN as the current setup)

- Build command `pnpm build`, output dir `dist`.
- SPA fallback is automatic (or add `public/_redirects`: `/*  /index.html  200`).
- ⚠️ **The SPA fallback is also served for assets that have not propagated yet** —
  see "Stale chunks after a deploy" below.

**AWS S3 + CloudFront**

- `aws s3 sync dist/ s3://<bucket> --delete`
- CloudFront: set **Default root object** `index.html`, and add a **custom error
  response**: HTTP 403 **and** 404 → response page `/index.html`, HTTP 200
  (this is the SPA fallback — without it, a hard refresh on `/partner/...` 404s).
- Invalidate cache after each deploy: `aws cloudfront create-invalidation --paths "/*"`.

**nginx** (self-host)

```nginx
location / { try_files $uri $uri/ /index.html; }
```

## 4. Post-deploy smoke check

- Open the app → you should NOT get a blank page or console CORS errors.
- Log in (admin + partner) — the session cookie must be set on `.fleet-taxi.id`.
- Hard-refresh a deep link (e.g. `/partner/fleet-monitoring`) → must load, not 404
  (verifies SPA fallback).
- DevTools → Network: requests go to `https://api.fleet-taxi.id/...` with
  `Cookie` sent and `200`s (verifies CORS + credentials).

## Stale chunks after a deploy

Symptom, seen twice in production: minutes after `wrangler pages deploy`, users
get the "Something went wrong!" boundary with
`TypeError: Failed to fetch dynamically imported module: .../assets/<chunk>.js`,
while the file itself serves fine to a fresh client.

Cause: Cloudflare Pages answers a request for a not-yet-propagated asset with the
**SPA fallback** — `index.html`, **HTTP 200**, `cache-control: public,
max-age=14400`. Check it yourself:

```bash
curl -sI https://fleet-taxi.id/assets/does-not-exist.js
```

`content-type: text/html` with a four-hour `max-age` means any browser that
loaded the app during the propagation window is holding HTML as the body of a
`.js` file for the next four hours. Every `import()` of that chunk fails until
the entry expires or the user hard-reloads. (`/` itself is fine —
`max-age=0, must-revalidate`.) The same trap once hit `/favicon.ico`.

Two mitigations are in the repo; neither is optional:

- `src/lib/stale-chunk` — hooks Vite's `vite:preloadError` and the router's
  `defaultOnCatch`, evicts the poisoned entry from the HTTP cache with a
  `cache: 'reload'` refetch, then reloads the page once. A sessionStorage stamp
  caps it at one reload per 30s, so a genuinely missing chunk reaches the error
  boundary instead of looping.
- `public/_headers` — caps `/assets/*` at `max-age=3600`. **Never** raise this
  to `immutable` / a long max-age: no header rule can distinguish a real asset
  from the fallback, so a long TTL would pin a poisoned response — including the
  entry bundle, where the app never boots far enough to self-heal.

## Notes

- Cache: fingerprinted `assets/*` are safe to cache long _in principle_, but see
  the stale-chunk section above for why we deliberately don't; `index.html`
  should be short-cache / no-cache so new deploys are picked up.
- Optional slimming: MSW is only used in dev/tests; the `browser-*.js` chunk is a
  lazy import gated on `VITE_USE_MSW` and is never fetched in prod, so it's dead
  weight (~160 kB gz) that could be excluded later, but it doesn't affect runtime.
