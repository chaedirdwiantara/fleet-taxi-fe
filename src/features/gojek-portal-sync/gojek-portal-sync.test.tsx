import { describe, it, expect, beforeEach } from 'vitest';
import { render, renderHook, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { GojekPortalSyncPage } from './GojekPortalSyncPage';
import { SettingsForm } from './components/SettingsForm';
import { RunNowCard } from './components/RunNowCard';
import {
  useGojekPortalRunsQuery,
  useGojekPortalSettingsQuery,
  useRunGojekPortalSync,
  useTestGojekPortalConnection,
} from './hooks';
import { patchGojekPortalSettings, resetGojekPortalSync, setSessionUser } from '@/mocks/handlers';
import { adminMe, superAdminMe } from '@/mocks/fixtures/partner';
import { seedGojekPortalSettings } from '@/mocks/fixtures/gojekPortalSync';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

// The page links into the router (Gojek Monitoring); mount it under a minimal
// memory router so <Link> has a context, exactly like the real route tree.
function renderPage(client = makeClient()) {
  const rootRoute = createRootRoute({ component: () => <GojekPortalSyncPage /> });
  const router = createRouter({
    routeTree: rootRoute.addChildren([createRoute({ getParentRoute: () => rootRoute, path: '/' })]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />, { wrapper: wrapperFor(client) });
}

beforeEach(() => {
  resetGojekPortalSync();
  setSessionUser(superAdminMe);
});

describe('Sinkronisasi Portal Gojek — page', () => {
  it('is gated to super_admin on the client (backend CASL is the real authority)', async () => {
    setSessionUser(adminMe);
    renderPage();
    expect(await screen.findByText('Akses ditolak')).toBeInTheDocument();
    expect(screen.queryByText('Akun & Jadwal')).not.toBeInTheDocument();
  });

  it('shows the status tiles, the stored account (never a password), and the history', async () => {
    renderPage();
    expect(await screen.findByText('Sinkronisasi Portal Gojek')).toBeInTheDocument();

    // schedule tile reflects settings; account tile shows the verified email
    expect(await screen.findByText('05:00 WIB · mundur 2 hari')).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getAllByText('finance@fleet-taxi.id').length).toBeGreaterThan(0);
    expect(screen.getByText(/^Teruji /)).toBeInTheDocument();

    // the password input is blank and only hints that one is stored
    const password = screen.getByLabelText('Kata sandi portal') as HTMLInputElement;
    expect(password.value).toBe('');
    expect(password.placeholder).toMatch(/tersimpan/);
    expect(document.body.textContent).not.toMatch(/passwordDigest/);

    // history rows (newest first) with status + trigger labels
    const table = screen.getByRole('table');
    await within(table).findByText('gojek-portal-2026-09-10_2026-09-11-run12.xlsx');
    expect(within(table).getAllByText('Berhasil')).toHaveLength(2);
    expect(within(table).getByText('Gagal')).toBeInTheDocument();
    expect(within(table).getAllByText('Jadwal')).toHaveLength(2);
    expect(within(table).getByText('Manual')).toBeInTheDocument();
    expect(within(table).getByText('640 dilewati')).toBeInTheDocument();
  });

  it('warns when the server has no encryption key and blocks running', async () => {
    patchGojekPortalSettings({ encryptionConfigured: false });
    renderPage();
    expect(await screen.findByText(/GOJEK_PORTAL_ENCRYPTION_KEY/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jalankan Sekarang/ })).toBeDisabled();
    expect(screen.getByLabelText('Kata sandi portal')).toBeDisabled();
  });
});

describe('SettingsForm', () => {
  it('saves the account + schedule and reports success', async () => {
    const user = userEvent.setup();
    render(<SettingsForm settings={seedGojekPortalSettings()} />, {
      wrapper: wrapperFor(makeClient()),
    });
    const email = screen.getByLabelText('Email portal');
    await user.clear(email);
    await user.type(email, 'ops@fleet-taxi.id');
    await user.click(screen.getByRole('button', { name: /Simpan/ }));
    expect(await screen.findByText('Pengaturan tersimpan.')).toBeInTheDocument();

    const { result } = renderHook(() => useGojekPortalSettingsQuery(), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.email).toBe('ops@fleet-taxi.id');
    expect(result.current.data!.hasPassword).toBe(true); // blank field kept the stored one
  });

  it('validates the email before hitting the API', async () => {
    const user = userEvent.setup();
    render(<SettingsForm settings={seedGojekPortalSettings()} />, {
      wrapper: wrapperFor(makeClient()),
    });
    await user.clear(screen.getByLabelText('Email portal'));
    await user.click(screen.getByRole('button', { name: /Simpan/ }));
    expect(await screen.findByText('Email akun portal wajib diisi')).toBeInTheDocument();
  });

  it('Uji Koneksi tests the typed password and surfaces a rejected login', async () => {
    const user = userEvent.setup();
    render(<SettingsForm settings={seedGojekPortalSettings()} />, {
      wrapper: wrapperFor(makeClient()),
    });
    await user.click(screen.getByRole('button', { name: /Uji Koneksi/ }));
    expect(
      await screen.findByText(/Koneksi berhasil — login sebagai finance@fleet-taxi.id/),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Kata sandi portal'), 'salah');
    await user.click(screen.getByRole('button', { name: /Uji Koneksi/ }));
    expect(
      await screen.findByText(/Uji koneksi gagal: Login portal Gojek ditolak/),
    ).toBeInTheDocument();
  });
});

describe('RunNowCard', () => {
  it('queues a run, polls it to completion, and rejects a bad range locally', async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(<RunNowCard status={undefined} lookbackDays={1} canRun />, {
      wrapper: wrapperFor(client),
    });

    // local validation mirrors the backend (no request goes out)
    await user.type(screen.getByLabelText('Dari tanggal (WIB)'), '2026-09-05');
    await user.type(screen.getByLabelText('Sampai tanggal (WIB)'), '2026-09-01');
    expect(
      await screen.findByText('Tanggal awal tidak boleh melewati tanggal akhir.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jalankan Sekarang/ })).toBeDisabled();
    await user.clear(screen.getByLabelText('Dari tanggal (WIB)'));
    await user.clear(screen.getByLabelText('Sampai tanggal (WIB)'));

    await user.click(screen.getByRole('button', { name: /Jalankan Sekarang/ }));
    expect(await screen.findByText(/^Sinkronisasi #100/)).toBeInTheDocument();
    // the mock worker finishes after three polls (2s each)
    expect(
      await screen.findByText(/Selesai — 960 baris masuk/, {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jalankan Sekarang/ })).toBeEnabled();
  }, 15_000);
});

describe('hooks', () => {
  it('lists runs newest-first with meta, and a run request lands in the list', async () => {
    const client = makeClient();
    const runs = renderHook(() => useGojekPortalRunsQuery(1), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(runs.result.current.isSuccess).toBe(true));
    expect(runs.result.current.data!.meta).toMatchObject({ page: 1, total: 3 });
    expect(runs.result.current.data!.data.map((r) => r.id)).toEqual([12, 11, 10]);

    const run = renderHook(() => useRunGojekPortalSync(), { wrapper: wrapperFor(client) });
    await act(async () => {
      const created = await run.result.current.mutateAsync({});
      expect(created).toMatchObject({ status: 'running', trigger: 'manual' });
    });
    await waitFor(() => expect(runs.result.current.data!.data[0]!.id).toBe(100));
  });

  it('test-connection with the stored account bumps lastVerifiedAt', async () => {
    const client = makeClient();
    const test = renderHook(() => useTestGojekPortalConnection(), { wrapper: wrapperFor(client) });
    await act(async () => {
      const r = await test.result.current.mutateAsync({});
      expect(r.verifiedAt).toEqual(expect.any(String));
    });
    await act(async () => {
      const r = await test.result.current.mutateAsync({ email: 'lain@x.id', password: 'abc' });
      expect(r.verifiedAt).toBeNull(); // form values only — nothing stored
    });
  });
});
