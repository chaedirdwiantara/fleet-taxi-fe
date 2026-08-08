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

describe('AudienceTheme', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.audience;
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
});
