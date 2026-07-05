import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { LoginForm } from './LoginForm';

// Capture where a successful login navigates. LoginForm only pulls `useRouter`
// from the router package, so a minimal mock is enough.
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ history: { push: pushMock } }),
}));

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

const renderForm = (props: Parameters<typeof LoginForm>[0]) =>
  render(<LoginForm {...props} />, {
    wrapper: wrapperFor(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
  });

const submit = async (email: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), 'secret');
  await user.click(screen.getByRole('button', { name: 'Masuk' }));
};

describe('LoginForm — post-login landing target', () => {
  beforeEach(() => pushMock.mockClear());

  // Regression: the partner area is fleet-monitoring-scoped and `/partner/dashboard`
  // was removed. Landing there rendered the router Not-Found boundary. The partner
  // home is `/partner`, whose index route forwards to `/partner/fleet-monitoring`.
  it('sends a partner to /partner (the real home), not the removed /partner/dashboard', async () => {
    renderForm({ audience: 'partner' });
    await submit('ops@bhisa.id');
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/partner'));
    expect(pushMock).not.toHaveBeenCalledWith('/partner/dashboard');
  });

  it('sends an admin to /admin', async () => {
    renderForm({ audience: 'admin' });
    await submit('admin@fleet-taxi.id');
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/admin'));
  });

  it('honours an explicit redirect over the audience default', async () => {
    renderForm({ audience: 'partner', redirect: '/partner/daftarkan-plat' });
    await submit('ops@bhisa.id');
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/partner/daftarkan-plat'));
  });
});
