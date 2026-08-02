/**
 * Recovery for the "Failed to fetch dynamically imported module" error that
 * hits users right after a `wrangler pages deploy`.
 *
 * Cloudflare Pages answers requests for asset paths that have not propagated
 * yet with the SPA fallback — `index.html`, HTTP 200, and (crucially)
 * `cache-control: public, max-age=14400`. A browser that loads the app inside
 * that propagation window stores HTML as the body of a `.js` file for four
 * hours, so every later `import()` of that chunk keeps failing until the entry
 * expires or the user hard-reloads.
 *
 * The cure has two halves and needs both:
 *   1. evict the poisoned entry from the HTTP cache (`fetch(url, { cache:
 *      'reload' })` re-requests it from the network and overwrites the cached
 *      response), otherwise a plain reload just re-reads the same HTML;
 *   2. reload the page so the router can retry the route it failed to load.
 *
 * A sessionStorage stamp keeps this to one reload per cooldown window. The
 * stamp is deliberately *not* cleared once the app boots again: after a reload
 * the router retries the same route immediately, and if that still fails the
 * chunk is genuinely gone — the error boundary must win, not another reload.
 */

const RELOAD_STAMP_KEY = 'fleet-taxi:stale-chunk-reloaded-at';

/** A second failure this soon after a recovery reload is not a stale chunk. */
const RELOAD_COOLDOWN_MS = 30_000;

/** Cap on the cache-eviction request so a slow network can't strand the user. */
const EVICT_TIMEOUT_MS = 3_000;

// Chrome: "Failed to fetch dynamically imported module: <url>"
// Firefox: "error loading dynamically imported module: <url>"
// Safari:  "Importing a module script failed." (no url)
// Any browser, when the poisoned HTML is actually parsed as a module:
//   "Expected a JavaScript module script but the server responded with a MIME
//    type of text/html"
const DYNAMIC_IMPORT_FAILURE =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|expected a javascript(-or-wasm)? module script|unable to preload css/i;

const ABSOLUTE_URL = /https?:\/\/[^\s'"()]+/;

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : '';
}

/** Does this error look like a chunk that failed to load (vs. app code throwing)? */
export function isDynamicImportError(error: unknown): boolean {
  return DYNAMIC_IMPORT_FAILURE.test(messageOf(error));
}

/** The module URL named in the error message, when the browser includes one. */
export function moduleUrlFromError(error: unknown): string | null {
  return ABSOLUTE_URL.exec(messageOf(error))?.[0] ?? null;
}

// sessionStorage throws in Safari private mode and in cross-origin iframes;
// without it we simply lose the guard, which is worse than losing the recovery.
function readStamp(): number | null {
  try {
    const raw = sessionStorage.getItem(RELOAD_STAMP_KEY);
    const at = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

function writeStamp(at: number): void {
  try {
    sessionStorage.setItem(RELOAD_STAMP_KEY, String(at));
  } catch {
    /* ignore — the reload still happens, just unguarded */
  }
}

async function evictFromHttpCache(url: string): Promise<void> {
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, EVICT_TIMEOUT_MS));
  const refetch = fetch(url, { cache: 'reload', credentials: 'omit' }).then(
    () => undefined,
    () => undefined,
  );
  await Promise.race([refetch, timeout]);
}

/**
 * Reload once to recover from a stale chunk. Returns `false` when the error is
 * not a chunk failure or when the guard has already spent this session's
 * reload — in both cases the caller should let the error surface.
 */
export async function recoverFromStaleChunk(error: unknown): Promise<boolean> {
  if (!isDynamicImportError(error)) return false;

  const now = Date.now();
  const lastReload = readStamp();
  if (lastReload !== null && now - lastReload < RELOAD_COOLDOWN_MS) {
    return false;
  }
  writeStamp(now);

  const url = moduleUrlFromError(error);
  if (url !== null) await evictFromHttpCache(url);

  window.location.reload();
  return true;
}

/**
 * Listen for Vite's `vite:preloadError`, which fires for every failed
 * `import()` in a production build — including the route chunks TanStack
 * Router code-splits. The event is left un-prevented on purpose: if the guard
 * declines to reload, the error must still reach the router's error boundary.
 */
export function installStaleChunkRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    void recoverFromStaleChunk((event as Event & { payload?: unknown }).payload);
  });
}
