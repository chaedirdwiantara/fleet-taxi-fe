import { describe, it, expect, beforeEach } from 'vitest';
import { render, renderHook, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useAdminUsersQuery,
  useCreateAdminUser,
  useCreateApiKey,
  useCreatePartner,
  useCreatePartnerUser,
  usePartnersQuery,
} from './hooks';
import { ApiKeyDialog, UserManagementPage } from './UserManagementPage';
import { setSessionUser, resetUserManagement } from '@/mocks/handlers';
import { adminMe, superAdminMe } from '@/mocks/fixtures/partner';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

beforeEach(() => {
  resetUserManagement();
  setSessionUser(null);
});

describe('admin user-management hooks (super_admin only)', () => {
  it('lists admin/staff users (partnerId null) for a super_admin', async () => {
    setSessionUser(superAdminMe);
    const { result } = renderHook(() => useAdminUsersQuery('admin'), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.some((u) => u.email === 'admin@fleet-taxi.id')).toBe(true);
    // the admin list must not contain partner-portal users
    expect(result.current.data!.every((u) => u.partner === null)).toBe(true);
  });

  it('blocks a non-super_admin at the endpoint (403)', async () => {
    setSessionUser(adminMe); // plain admin
    const { result } = renderHook(() => useAdminUsersQuery('admin'), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('creates an admin user (mustChangePassword=true) and rejects a duplicate email (409)', async () => {
    setSessionUser(superAdminMe);
    const { result } = renderHook(() => useCreateAdminUser(), {
      wrapper: wrapperFor(makeClient()),
    });

    let created!: { mustChangePassword?: boolean; roles: string[] };
    await act(async () => {
      created = await result.current.mutateAsync({
        email: 'newstaff@fleet-taxi.id',
        fullName: 'New Staff',
        password: 'password123',
        roles: ['finance'],
      });
    });
    expect(created.mustChangePassword).toBe(true);
    expect(created.roles).toEqual(['finance']);

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          email: 'newstaff@fleet-taxi.id',
          fullName: 'Dup',
          password: 'password123',
          roles: ['admin'],
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  it('creates a partner + portal user (linked) and rejects a duplicate partner code (409)', async () => {
    setSessionUser(superAdminMe);
    const client = makeClient();
    const wrapper = wrapperFor(client);

    const { result: partner } = renderHook(() => useCreatePartner(), { wrapper });
    let created!: { id: number; code: string };
    await act(async () => {
      created = await partner.current.mutateAsync({
        code: 'NEWCO',
        name: 'New Co',
        type: 'shuttle',
      });
    });
    expect(created.code).toBe('NEWCO');

    await act(async () => {
      await expect(
        partner.current.mutateAsync({ code: 'newco', name: 'Dup' }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    const { result: user } = renderHook(() => useCreatePartnerUser(), { wrapper });
    await act(async () => {
      await user.current.mutateAsync({
        partnerId: created.id,
        email: 'portal@newco.id',
        fullName: 'Portal User',
        password: 'password123',
      });
    });

    const { result: list } = renderHook(() => useAdminUsersQuery('partner'), { wrapper });
    await waitFor(() => expect(list.current.isSuccess).toBe(true));
    const row = list.current.data!.find((u) => u.email === 'portal@newco.id');
    expect(row).toBeDefined();
    expect(row!.roles).toEqual(['partner']);
    expect(row!.partner).toMatchObject({ code: 'NEWCO' });
  });

  it('generates an API key returning a rawKey once', async () => {
    setSessionUser(superAdminMe);
    const { result } = renderHook(() => useCreateApiKey(), { wrapper: wrapperFor(makeClient()) });
    let key!: { rawKey: string; keyPrefix: string };
    await act(async () => {
      key = await result.current.mutateAsync({ partnerId: 7 });
    });
    expect(key.rawKey).toMatch(/^ftk_/);
    expect(key.keyPrefix.length).toBeGreaterThan(0);
  });

  it('exposes partners for the picker', async () => {
    setSessionUser(superAdminMe);
    const { result } = renderHook(() => usePartnersQuery(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.some((p) => p.code === 'BHISA')).toBe(true);
  });
});

describe('UserManagementPage — super_admin gate + create flow', () => {
  it('shows an access-denied state for a non-super_admin', async () => {
    setSessionUser(adminMe);
    render(<UserManagementPage />, { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(screen.getByText('Akses ditolak')).toBeInTheDocument());
    expect(screen.queryByText('Manajemen Akun')).not.toBeInTheDocument();
  });

  it('lets a super_admin see the page and create an admin user (list updates)', async () => {
    setSessionUser(superAdminMe);
    const user = userEvent.setup();
    render(<UserManagementPage />, { wrapper: wrapperFor(makeClient()) });

    // page + seeded admin list render
    await waitFor(() => expect(screen.getByText('Manajemen Akun')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('admin@fleet-taxi.id')).toBeInTheDocument());

    // create a new admin user with the default role (Admin) — no Select interaction
    await user.type(screen.getByLabelText('Email'), 'created@fleet-taxi.id');
    await user.type(screen.getByLabelText('Nama Lengkap'), 'Created Admin');
    await user.type(screen.getByLabelText('Password Awal'), 'password123');
    await user.click(screen.getByRole('button', { name: /Buat User Admin/i }));

    // the new row appears in the list
    await waitFor(() => expect(screen.getByText('created@fleet-taxi.id')).toBeInTheDocument());
  });
});

describe('ApiKeyDialog — rawKey shown once', () => {
  it('renders the raw key with a one-time warning and a copy control', () => {
    render(
      <ApiKeyDialog
        apiKey={{
          id: 1,
          keyPrefix: 'ftk_mockkey0',
          rawKey: 'ftk_mockkey0000000000000000000000000000000000',
        }}
        onClose={() => {}}
      />,
      { wrapper: wrapperFor(makeClient()) },
    );
    expect(screen.getByText('ftk_mockkey0000000000000000000000000000000000')).toBeInTheDocument();
    expect(screen.getByText(/hanya ditampilkan sekali/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salin API key/i })).toBeInTheDocument();
  });
});
