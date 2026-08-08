import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import type { Audience } from './AppShell';

/**
 * Which console the current URL belongs to. Derived from the path rather than
 * from the session, so the login screens — which have no session yet — already
 * wear the right accent.
 */
export function audienceOfPath(pathname: string): Audience {
  return pathname === '/partner' || pathname.startsWith('/partner/') ? 'partner' : 'admin';
}

/**
 * Browser-chrome identity per audience: the tab icon and the mobile address-bar
 * tint. Same artwork, different gradient — the partner blues are the hex form of
 * `--brand-gradient-from|to` under `[data-audience='partner']` in index.css, so
 * the tab and the sidebar panel can never drift apart.
 *
 * `?v=` is the cache key Chrome stores favicons under; it ignores Cache-Control
 * and survives a hard reload, so it has to be bumped whenever the artwork
 * changes (index.html carries the same note).
 */
const CHROME: Record<Audience, { icon: string; themeLight: string; themeDark: string }> = {
  admin: { icon: '/favicon.svg?v=2', themeLight: '#E01937', themeDark: '#A3132C' },
  partner: { icon: '/favicon-partner.svg?v=1', themeLight: '#3082F6', themeDark: '#3052B3' },
};

/**
 * Paints the audience accent (see the `[data-audience]` block in index.css) and
 * swaps the browser chrome to match.
 *
 * Writes to <html> rather than rendering a wrapper, for the same reason
 * ThemeProvider does: Radix portals its dialogs, sheets, popovers and dropdowns
 * into <body>, so an accent scoped to a layout element would stop at the portal
 * boundary and those surfaces would fall back to the admin red.
 *
 * Mounted once at the router root, so every `/partner/*` route — including
 * `/partner/login`, which sits outside the `_partner` layout — is covered
 * without any per-route wiring.
 */
export function AudienceTheme() {
  const { pathname } = useLocation();

  useEffect(() => {
    const audience = audienceOfPath(pathname);
    document.documentElement.dataset.audience = audience;

    const chrome = CHROME[audience];
    // Only the SVG icon is swapped. The .ico beside it is the fallback for
    // browsers with no SVG-favicon support, and re-cutting a second binary per
    // audience buys nothing there — every browser that can render this app
    // prefers the SVG.
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]');
    if (icon) icon.href = chrome.icon;

    for (const [scheme, color] of [
      ['(prefers-color-scheme: light)', chrome.themeLight],
      ['(prefers-color-scheme: dark)', chrome.themeDark],
    ] as const) {
      const meta = document.querySelector<HTMLMetaElement>(
        `meta[name="theme-color"][media="${scheme}"]`,
      );
      if (meta) meta.content = color;
    }
  }, [pathname]);

  return null;
}
