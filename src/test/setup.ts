import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from '@/mocks/server';

// jsdom lacks ResizeObserver (needed by TanStack Virtual + Radix). A real RO
// fires its callback on observe(); emulate that with the element's rect so
// the virtualizer measures its scroll viewport (tests mock the rect).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    #cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.#cb = cb;
    }
    observe(target: Element) {
      const rect = target.getBoundingClientRect();
      const size = { inlineSize: rect.width, blockSize: rect.height };
      this.#cb(
        [
          {
            target,
            contentRect: rect,
            borderBoxSize: [size],
            contentBoxSize: [size],
            devicePixelContentBoxSize: [size],
          } as unknown as ResizeObserverEntry,
        ],
        this,
      );
    }
    unobserve() {}
    disconnect() {}
  };
}

// jsdom lacks matchMedia (needed by ThemeProvider's system-preference check).
if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  // reset the mock cookie-session between tests
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
});
afterAll(() => server.close());
