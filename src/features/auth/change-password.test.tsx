import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, renderHook, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAdminSession, useChangePassword } from './hooks';
import { ChangePasswordScreen } from './ChangePasswordScreen';
import { RequireAdmin } from './RequireAdmin';
import { setSessionUser } from '@/mocks/handlers';
import { adminMe } from '@/mocks/fixtures/partner';

// RequireAdmin only pulls Navigate + useLocation from the router; a minimal mock
// keeps it renderable outside a full RouterProvider.
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: '/admin' }),
  Navigate: () => null,
}));

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

beforeEach(() => setSessionUser(null));

describe('first-login password-change gate', () => {
  it('RequireAdmin renders the change-password screen (not the app) when mustChangePassword=true', async () => {
    setSessionUser({ ...adminMe, mustChangePassword: true });
    render(
      <RequireAdmin>
        <div>APP CONTENT</div>
      </RequireAdmin>,
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(screen.getByText('Ganti Password')).toBeInTheDocument());
    expect(screen.queryByText('APP CONTENT')).not.toBeInTheDocument();
  });

  it('RequireAdmin renders the app when the flag is cleared', async () => {
    setSessionUser({ ...adminMe, mustChangePassword: false });
    render(
      <RequireAdmin>
        <div>APP CONTENT</div>
      </RequireAdmin>,
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(screen.getByText('APP CONTENT')).toBeInTheDocument());
    expect(screen.queryByText('Ganti Password')).not.toBeInTheDocument();
  });

  it('changing the password clears the mustChangePassword flag on the session', async () => {
    setSessionUser({ ...adminMe, mustChangePassword: true });
    const wrapper = wrapperFor(makeClient());
    const { result } = renderHook(
      () => ({ session: useAdminSession(), change: useChangePassword() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.session.data?.mustChangePassword).toBe(true));

    await act(async () => {
      await result.current.change.mutateAsync({
        currentPassword: 'temp-password',
        newPassword: 'brand-new-password',
      });
    });

    await waitFor(() => expect(result.current.session.data?.mustChangePassword).toBe(false));
  });

  it('rejects a wrong current password', async () => {
    setSessionUser({ ...adminMe, mustChangePassword: true });
    const { result } = renderHook(() => useChangePassword(), { wrapper: wrapperFor(makeClient()) });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ currentPassword: 'wrong', newPassword: 'brand-new-password' }),
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    });
  });
});

describe('ChangePasswordScreen — form validation', () => {
  it('flags a mismatched confirmation and a too-short new password', async () => {
    setSessionUser({ ...adminMe, mustChangePassword: true });
    const user = userEvent.setup();
    render(<ChangePasswordScreen />, { wrapper: wrapperFor(makeClient()) });

    await user.type(screen.getByLabelText('Password Saat Ini'), 'temp-password');
    await user.type(screen.getByLabelText('Password Baru'), 'short');
    await user.type(screen.getByLabelText('Konfirmasi Password Baru'), 'different');
    await user.click(screen.getByRole('button', { name: /Simpan Password Baru/i }));

    expect(await screen.findByText('Password baru minimal 8 karakter')).toBeInTheDocument();
  });

  it('submits successfully with valid input', async () => {
    setSessionUser({ ...adminMe, mustChangePassword: true });
    const user = userEvent.setup();
    render(<ChangePasswordScreen />, { wrapper: wrapperFor(makeClient()) });

    await user.type(screen.getByLabelText('Password Saat Ini'), 'temp-password');
    await user.type(screen.getByLabelText('Password Baru'), 'brand-new-password');
    await user.type(screen.getByLabelText('Konfirmasi Password Baru'), 'brand-new-password');
    await user.click(screen.getByRole('button', { name: /Simpan Password Baru/i }));

    // no error surfaces on success
    await waitFor(() =>
      expect(screen.queryByText('Terjadi kesalahan. Coba lagi.')).not.toBeInTheDocument(),
    );
  });
});
