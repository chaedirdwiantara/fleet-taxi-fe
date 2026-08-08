import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AudienceTheme, audienceOfPath } from './AudienceTheme';

// AudienceTheme only reads the pathname; stubbing the hook keeps it renderable
// outside a RouterProvider — same approach as features/deposit-installment/cop.test.tsx.
const pathname = { current: '/' };
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: pathname.current }),
}));

const renderAt = (path: string) => {
  pathname.current = path;
  return render(<AudienceTheme />);
};

describe('audienceOfPath', () => {
  it('claims the whole partner portal, login screen included', () => {
    expect(audienceOfPath('/partner')).toBe('partner');
    expect(audienceOfPath('/partner/login')).toBe('partner');
    expect(audienceOfPath('/partner/rental/monitoring')).toBe('partner');
  });

  it('leaves everything else on the admin accent', () => {
    expect(audienceOfPath('/')).toBe('admin');
    expect(audienceOfPath('/admin/fleet-monitoring')).toBe('admin');
    // A path that merely STARTS with the same letters is not the portal.
    expect(audienceOfPath('/partnership')).toBe('admin');
  });
});

// The head tags AudienceTheme drives; index.html ships them, jsdom does not.
const iconLink = () =>
  document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]')!;
const themeMeta = (scheme: 'light' | 'dark') =>
  document.querySelector<HTMLMetaElement>(
    `meta[name="theme-color"][media="(prefers-color-scheme: ${scheme})"]`,
  )!;

describe('AudienceTheme', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.audience;
    document.head.innerHTML = `
      <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
      <link rel="icon" href="/favicon.ico?v=2" sizes="32x32" />
      <meta name="theme-color" content="#E01937" media="(prefers-color-scheme: light)" />
      <meta name="theme-color" content="#A3132C" media="(prefers-color-scheme: dark)" />
    `;
  });

  it('tags <html> so portalled surfaces inherit the accent too', () => {
    renderAt('/partner/all-fleet-monitoring');
    expect(document.documentElement.dataset.audience).toBe('partner');
  });

  it('switches back when navigation leaves the portal', () => {
    const { rerender } = renderAt('/partner/checkpoint');
    expect(document.documentElement.dataset.audience).toBe('partner');

    pathname.current = '/admin/gojek/dashboard';
    rerender(<AudienceTheme />);
    expect(document.documentElement.dataset.audience).toBe('admin');
  });

  it('flies the blue mark in the tab while in the portal', () => {
    renderAt('/partner/login');
    expect(iconLink().getAttribute('href')).toBe('/favicon-partner.svg?v=1');
    expect(themeMeta('light').content).toBe('#3082F6');
    expect(themeMeta('dark').content).toBe('#3052B3');
  });

  it('restores the brand red mark on the admin console', () => {
    const { rerender } = renderAt('/partner/login');
    expect(iconLink().getAttribute('href')).toBe('/favicon-partner.svg?v=1');

    pathname.current = '/admin';
    rerender(<AudienceTheme />);
    expect(iconLink().getAttribute('href')).toBe('/favicon.svg?v=2');
    expect(themeMeta('light').content).toBe('#E01937');
    expect(themeMeta('dark').content).toBe('#A3132C');
  });

  it('leaves the .ico fallback alone — only the SVG icon is per-audience', () => {
    renderAt('/partner');
    const ico = document.querySelector<HTMLLinkElement>('link[rel="icon"][sizes="32x32"]')!;
    expect(ico.getAttribute('href')).toBe('/favicon.ico?v=2');
  });

  it('does not throw when the head tags are missing (tests, embeds)', () => {
    document.head.innerHTML = '';
    expect(() => renderAt('/partner')).not.toThrow();
    expect(document.documentElement.dataset.audience).toBe('partner');
  });
});
