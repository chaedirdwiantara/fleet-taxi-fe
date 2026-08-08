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
 * Paints the audience accent (see the `[data-audience]` block in index.css).
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
    document.documentElement.dataset.audience = audienceOfPath(pathname);
  }, [pathname]);

  return null;
}
