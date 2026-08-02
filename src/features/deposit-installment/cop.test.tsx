import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { CopPage } from './CopPage';
import { copSearchSchema, type CopSearch } from './copSearchSchema';
import { resetInstallments } from '@/mocks/fixtures/depositInstallment';

// CopPage only pulls <Link> from the router (shortcuts back to the Cicilan
// menu); a plain anchor keeps it renderable outside a RouterProvider — same
// approach as features/auth/change-password.test.tsx.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

// Radix Select needs these pointer APIs that jsdom doesn't implement.
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLElement.prototype.hasPointerCapture = () => false;
window.HTMLElement.prototype.releasePointerCapture = () => {};

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

// The route owns the URL search state in the app; the harness emulates it so
// onPatch round-trips like navigate({ search }) would.
function Harness() {
  const [search, setSearch] = useState<CopSearch>(() => copSearchSchema.parse({}));
  return <CopPage search={search} onPatch={(p) => setSearch((prev) => ({ ...prev, ...p }))} />;
}

const renderPage = () => render(<Harness />, { wrapper: wrapperFor(makeClient()) });

beforeEach(() => {
  resetInstallments();
});

describe('CopPage', () => {
  it('lists only COP rules with their programme figures', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText('YULIUS BAMBANG TRIUTOMO').length).toBeGreaterThan(0),
    );
    // seed has 5 cicilan rules, 2 of which are COP
    expect(screen.getByText(/Menampilkan 1–2 dari 2 program COP/)).toBeInTheDocument();
    expect(screen.getAllByText('ERPAN ERPIANA').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('AMIR YUN')).toHaveLength(0); // Cicilan Deposit, bukan COP

    // 1.800 × Rp 35.000 = Rp 63.000.000 selama ≈ 60 bulan
    expect(screen.getAllByText(/1\.800 hari/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/≈ 60 bulan/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rp\s?63\.000\.000/).length).toBeGreaterThan(0);
  });

  it('shows withdrawals separately from active days, and the schedule gap', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('YULIUS BAMBANG TRIUTOMO').length).toBeGreaterThan(0),
    );

    // Yulius: 4 hari aktif, 3 kali penarikan (satu hari di bawah setoran wajib)
    expect(screen.getAllByText(/dari 4 hari aktif/).length).toBeGreaterThan(0);
    // terbayar 129.000 dari jadwal 140.000 → tertinggal 11.000
    expect(screen.getAllByText(/Rp\s?129\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rp\s?11\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('tertinggal').length).toBeGreaterThan(0);
    // Erpan (mode tetap) selalu memotong nominal penuh → tidak ada gap
    expect(screen.getAllByText('Sesuai jadwal').length).toBeGreaterThan(0);
  });

  it('shows the driver list only — no programme summary cards', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('YULIUS BAMBANG TRIUTOMO').length).toBeGreaterThan(0),
    );

    // 'Total Kewajiban' survives ONLY as a table column/label, never as a KPI
    // card, so the aggregate figures must not appear anywhere.
    expect(screen.queryByText(/Rp\s?126\.000\.000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rp\s?125\.801\.000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/kali penarikan$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/berjalan · .* lunas/)).not.toBeInTheDocument();
  });

  it('filters by driver via the debounced search', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('YULIUS BAMBANG TRIUTOMO').length).toBeGreaterThan(0),
    );

    await userEvent.type(screen.getByLabelText('Cari driver atau plat'), 'erpan');
    await waitFor(() => expect(screen.getByText(/dari 1 program COP/)).toBeInTheDocument(), {
      timeout: 2000,
    });
    expect(screen.queryAllByText('YULIUS BAMBANG TRIUTOMO')).toHaveLength(0);
  });

  it('opens the daily rekap for one programme', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('YULIUS BAMBANG TRIUTOMO').length).toBeGreaterThan(0),
    );

    await userEvent.click(
      screen.getAllByRole('button', {
        name: 'Rekap penarikan YULIUS BAMBANG TRIUTOMO',
      })[0]!,
    );
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByText('Rekap Cicilan')).toBeInTheDocument();
    expect(within(sheet).getByText('COP (Car Ownership Program)')).toBeInTheDocument();
    await waitFor(() => expect(within(sheet).getByText('ke-1')).toBeInTheDocument());
    expect(within(sheet).getByText('ke-4')).toBeInTheDocument();
  });

  it('shows the empty state when the filter matches nothing', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('YULIUS BAMBANG TRIUTOMO').length).toBeGreaterThan(0),
    );

    await userEvent.type(screen.getByLabelText('Cari driver atau plat'), 'zzz-nope');
    await waitFor(
      () => expect(screen.getByText('Tidak ada program yang cocok')).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });
});
