# Frontend deploy (fleet-taxi-dashboard-web)

The FE is a **static SPA** (Vite build → `dist/`). Any static host works; the only
special requirement is **SPA fallback routing** (serve `index.html` for unknown
paths — TanStack Router does client-side routing).

## 0. Prerequisites (backend must be up first)

- Backend deployed and reachable over **HTTPS** at `VITE_API_BASE_URL`
  (default `https://api.fleet-taxi.id`). See `../../BE/docs/RUNBOOK.md`.
- Backend **CORS** allowlist includes the app origin (`https://fleet-taxi.id`)
  with `credentials: true`.
- Session cookie issued with `Domain=.fleet-taxi.id`, `SameSite=None`, `Secure`
  so it flows cross-subdomain (apex → api.*). (Already configured in the BE.)

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
**SPA fallback** — `index.html`, **HTTP 200** — cached under the *asset's*
policy. Check it yourself:

```bash
curl -sI https://fleet-taxi.id/assets/does-not-exist.js
```

`content-type: text/html` on a `.js` path means any browser that loaded the app
during the propagation window is holding HTML as the body of that chunk until the
response's `max-age` runs out. Every `import()` of it fails until then, or until
the user hard-reloads. (`/` itself is fine — `max-age=0, must-revalidate`.) The
same trap once hit `/favicon.ico`. How long the damage lasts is exactly what the
`max-age` cap below controls, so read the TTL that comes back — not just the
content type.

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

### The `_headers` cap only works if the zone respects it

`public/_headers` is applied by **Pages**. On the custom domain the **zone**
sits in front of that and can rewrite `max-age` on the way out: if Caching →
Configuration → **Browser Cache TTL** is set to a fixed duration, that value wins
and the one-hour cap above silently becomes whatever the zone says — the long TTL
the cap exists to prevent. A Cache Rule targeting `/assets/*` can do the same.

Verify on both hosts after a deploy; **both must report `max-age=3600`**:

```bash
curl -sI https://<deployment>.fleet-taxi-web.pages.dev/assets/<hashed>.js
```

```bash
curl -sI https://fleet-taxi.id/assets/<hashed>.js
```

Observed on 2026-08-08 (deploy `048e7b8`): the Pages URL returned
`max-age=3600`, the custom domain `max-age=14400` — a four-hour poisoning window
instead of one. The tell that the rule *is* matching and only the TTL is
overridden: `X-Content-Type-Options: nosniff`, from the same `/assets/*` block,
survives on the custom domain, and so does `must-revalidate`; only `max-age`
changes. `/index.html` at `max-age=0` is left alone, so the root document looks
healthy while every chunk does not.

Fix it on the zone, not in the repo: set **Browser Cache TTL** to **Respect
Existing Headers**, or add a Cache Rule for `/assets/*` that does the same.
Requires Cloudflare dashboard access to the `fleet-taxi.id` zone.

## Notes

- Cache: fingerprinted `assets/*` are safe to cache long _in principle_, but see
  the stale-chunk section above for why we deliberately don't; `index.html`
  should be short-cache / no-cache so new deploys are picked up.
- Optional slimming: MSW is only used in dev/tests; the `browser-*.js` chunk is a
  lazy import gated on `VITE_USE_MSW` and is never fetched in prod, so it's dead
  weight (~160 kB gz) that could be excluded later, but it doesn't affect runtime.
