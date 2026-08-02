import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installStaleChunkRecovery,
  isDynamicImportError,
  moduleUrlFromError,
  recoverFromStaleChunk,
} from './index';

const CHUNK_URL = 'https://fleet-taxi.id/assets/fleet-monitoring-C1a2b3.js';
const chunkError = () => new Error(`Failed to fetch dynamically imported module: ${CHUNK_URL}`);

let reload: ReturnType<typeof vi.fn>;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  reload = vi.fn();
  // jsdom's location.reload is not writable; replace the whole object.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });
  fetchSpy = vi.fn().mockResolvedValue(new Response(''));
  vi.stubGlobal('fetch', fetchSpy);
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('isDynamicImportError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/a.js',
    'error loading dynamically imported module: https://x/a.js',
    'Importing a module script failed.',
    "Expected a JavaScript module script but the server responded with a MIME type of text/html'",
    'Unable to preload CSS for /assets/index-abc.css',
  ])('recognises %s', (message) => {
    expect(isDynamicImportError(new Error(message))).toBe(true);
  });

  it.each([
    new Error('Cannot read properties of undefined (reading "plateNumber")'),
    new Error('UNAUTHENTICATED'),
    null,
    undefined,
  ])('ignores unrelated failure %#', (error) => {
    expect(isDynamicImportError(error)).toBe(false);
  });
});

describe('moduleUrlFromError', () => {
  it('extracts the module url when the browser names one', () => {
    expect(moduleUrlFromError(chunkError())).toBe(CHUNK_URL);
  });

  it('returns null for browsers that omit it (Safari)', () => {
    expect(moduleUrlFromError(new Error('Importing a module script failed.'))).toBeNull();
  });
});

describe('recoverFromStaleChunk', () => {
  it('evicts the poisoned cache entry before reloading', async () => {
    await expect(recoverFromStaleChunk(chunkError())).resolves.toBe(true);

    expect(fetchSpy).toHaveBeenCalledWith(CHUNK_URL, {
      cache: 'reload',
      credentials: 'omit',
    });
    expect(reload).toHaveBeenCalledTimes(1);
    // eviction must happen first, or the reload re-reads the same HTML
    expect(fetchSpy.mock.invocationCallOrder[0]).toBeLessThan(reload.mock.invocationCallOrder[0]);
  });

  it('reloads without eviction when the error carries no url', async () => {
    await expect(
      recoverFromStaleChunk(new Error('Importing a module script failed.')),
    ).resolves.toBe(true);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('leaves unrelated errors alone', async () => {
    await expect(recoverFromStaleChunk(new Error('boom'))).resolves.toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads only once — a repeat failure must reach the error boundary', async () => {
    await recoverFromStaleChunk(chunkError());
    await expect(recoverFromStaleChunk(chunkError())).resolves.toBe(false);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('allows a fresh reload once the cooldown has passed (a later deploy)', async () => {
    const start = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(start);
    await recoverFromStaleChunk(chunkError());

    vi.spyOn(Date, 'now').mockReturnValue(start + 31_000);
    await expect(recoverFromStaleChunk(chunkError())).resolves.toBe(true);

    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('still reloads when the eviction request fails (offline)', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(recoverFromStaleChunk(chunkError())).resolves.toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not wait forever on a hanging eviction request', async () => {
    vi.useFakeTimers();
    fetchSpy.mockReturnValue(new Promise(() => {}));

    const recovered = recoverFromStaleChunk(chunkError());
    await vi.advanceTimersByTimeAsync(3_000);

    await expect(recovered).resolves.toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('installStaleChunkRecovery', () => {
  it("recovers from Vite's preloadError without swallowing the error", async () => {
    installStaleChunkRecovery();

    const event = Object.assign(new Event('vite:preloadError', { cancelable: true }), {
      payload: chunkError(),
    });
    window.dispatchEvent(event);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

    // un-prevented, so a blocked reload still surfaces in the error boundary
    expect(event.defaultPrevented).toBe(false);
  });
});
