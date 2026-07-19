import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { CicilanDepositPage } from './CicilanDepositPage';
import { cicilanSearchSchema, type CicilanSearch } from './searchSchema';
import { resetInstallments } from '@/mocks/fixtures/depositInstallment';

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

// The route normally owns the URL search state; the harness emulates it so
// the page's onPatch round-trips like navigate({ search }) would.
function Harness() {
  const [search, setSearch] = useState<CicilanSearch>(() => cicilanSearchSchema.parse({}));
  return (
    <CicilanDepositPage
      search={search}
      onPatch={(patch) => setSearch((prev) => ({ ...prev, ...patch }))}
    />
  );
}

const renderPage = () => render(<Harness />, { wrapper: wrapperFor(makeClient()) });

beforeEach(() => {
  resetInstallments();
});

describe('CicilanDepositPage', () => {
  it('renders the rules with derived progress and formatted rupiah', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText('Cicilan Deposit Driver Halim').length).toBeGreaterThan(0),
    );
    // seed rule 1: 3/20 paid × 25.000 → totalPaid 75.000, target 500.000
    expect(screen.getAllByText('3/20x').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rp\s?75\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rp\s?500\.000/).length).toBeGreaterThan(0);
    // seed rule 2 is fully paid → lunas badge
    expect(screen.getAllByText('lunas').length).toBeGreaterThan(0);
    expect(screen.getByText(/Menampilkan 1–3 dari 3 cicilan/)).toBeInTheDocument();
  });

  it('filters via debounced search', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Cicilan Deposit Driver Halim').length).toBeGreaterThan(0),
    );

    await userEvent.type(screen.getByLabelText('Cari judul, driver, atau plat'), 'suwanto');
    await waitFor(() => expect(screen.getByText(/dari 1 cicilan/)).toBeInTheDocument(), {
      timeout: 2000,
    });
    expect(screen.queryAllByText('Cicilan Deposit Driver Halim')).toHaveLength(0);
    expect(screen.getAllByText('Cicilan Deposit Suwanto').length).toBeGreaterThan(0);
  });

  it('creates a rule: shows Indonesian validation first, then submits', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Cicilan Deposit Driver Halim').length).toBeGreaterThan(0),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Tambah Data' }));
    const dialog = await screen.findByRole('dialog');

    // empty submit → zod messages in Bahasa Indonesia
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));
    expect(await within(dialog).findByText('Judul wajib diisi')).toBeInTheDocument();
    expect(within(dialog).getByText('Driver wajib dipilih')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('Judul'), 'Cicilan Deposit Yulius');
    await userEvent.click(within(dialog).getByLabelText('Pilih driver'));
    await userEvent.click(await screen.findByText('YULIUS BAMBANG TRIUTOMO'));
    await userEvent.type(within(dialog).getByLabelText('Nominal Cicilan (Rp)'), '25000');
    await userEvent.type(within(dialog).getByLabelText('Durasi (jumlah cicilan)'), '20');
    const tanggal = within(dialog).getByLabelText('Tanggal Aktif');
    await userEvent.type(tanggal, '2026-07-20');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getAllByText('Cicilan Deposit Yulius').length).toBeGreaterThan(0),
    );
    expect(screen.getByText(/dari 4 cicilan/)).toBeInTheDocument();
  });

  it('opens the Rekap sheet with the derived installment history', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Cicilan Deposit Driver Halim').length).toBeGreaterThan(0),
    );

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Rekap Cicilan Deposit Driver Halim' })[0]!,
    );
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByText('Rekap Cicilan')).toBeInTheDocument();
    await waitFor(() => expect(within(sheet).getByText('ke-1')).toBeInTheDocument());
    expect(within(sheet).getByText('ke-3')).toBeInTheDocument();
    expect(within(sheet).getByText('Setoran Hari Itu')).toBeInTheDocument();
    expect(within(sheet).getByText(/dapat berubah jika data periode diimpor ulang/)).toBeVisible();
  });

  it('deletes a rule after AlertDialog confirmation', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Cicilan Deposit Suwanto').length).toBeGreaterThan(0),
    );

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Hapus Cicilan Deposit Suwanto' })[0]!,
    );
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Hapus cicilan deposit ini?')).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Hapus' }));

    await waitFor(() => expect(screen.queryAllByText('Cicilan Deposit Suwanto')).toHaveLength(0));
    expect(screen.getByText(/dari 2 cicilan/)).toBeInTheDocument();
  });

  it('shows the empty state when the filter matches nothing', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Cicilan Deposit Driver Halim').length).toBeGreaterThan(0),
    );

    await userEvent.type(screen.getByLabelText('Cari judul, driver, atau plat'), 'zzz-nope');
    await waitFor(
      () => expect(screen.getByText('Tidak ada cicilan yang cocok')).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });
});
