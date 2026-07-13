import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { RentalMonitoringPage } from './RentalMonitoringPage';
import { rentalSearchSchema, type RentalSearch } from './searchSchema';
import { matchCogsKey } from './cogsMatcher';
import { resetPartnerPlates, resetPartnerRentals } from '@/mocks/handlers';
import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';

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
  const [search, setSearch] = useState<RentalSearch>(() => rentalSearchSchema.parse({}));
  return (
    <RentalMonitoringPage
      search={search}
      onPatch={(patch) => setSearch((prev) => ({ ...prev, ...patch }))}
    />
  );
}

const renderPage = () => render(<Harness />, { wrapper: wrapperFor(makeClient()) });

// a date inside the current WIB month (fixtures are anchored there too)
const isoDay = (day: number) =>
  `${currentYearWIB()}-${String(currentMonthWIB()).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

beforeEach(() => {
  resetPartnerRentals();
  resetPartnerPlates();
});

describe('matchCogsKey — vehicle type → COGS preset key', () => {
  it('maps the documented keywords', () => {
    expect(matchCogsKey('Denza D9 Premium')).toBe('denza');
    expect(matchCogsKey('Hyundai IONIQ 5')).toBe('ioniq');
    expect(matchCogsKey('Wuling Air EV Long Range')).toBe('air_ev');
    expect(matchCogsKey('Premium - BYD M6')).toBe('m6_cloud');
    expect(matchCogsKey('Wuling Cloud EV')).toBe('m6_cloud');
    expect(matchCogsKey('BYD Seal')).toBe('seal');
    expect(matchCogsKey('Wuling Binguo')).toBe('binguo_neta');
    expect(matchCogsKey('Neta V-II')).toBe('binguo_neta');
    expect(matchCogsKey('Darion X')).toBe('darion');
  });

  it('returns null for unknown or empty types', () => {
    expect(matchCogsKey('Toyota Avanza')).toBeNull();
    expect(matchCogsKey('')).toBeNull();
    expect(matchCogsKey(null)).toBeNull();
    expect(matchCogsKey(undefined)).toBeNull();
  });
});

describe('RentalMonitoringPage', () => {
  it('renders summary cards, nett per tipe, and the rental table from fixtures', async () => {
    renderPage();

    // summary cards
    await waitFor(() => expect(screen.getByText('Transaksi Rental')).toBeInTheDocument());
    expect(screen.getByText('Total Kotor (Paid)')).toBeInTheDocument();
    expect(screen.getByText('Total COGS (Paid)')).toBeInTheDocument();
    expect(screen.getByText('Nett Total (Paid)')).toBeInTheDocument();
    // seed has exactly one unpaid transaction
    expect(screen.getByText('1 transaksi belum dibayar')).toBeInTheDocument();

    // nett-per-tipe sidebar (paid rows only: m6_cloud + air_ev, not binguo_neta)
    expect(screen.getByText('Nett per Tipe')).toBeInTheDocument();
    expect(screen.getByText('m6_cloud')).toBeInTheDocument();
    expect(screen.getByText('air_ev')).toBeInTheDocument();

    // table rows from the fixtures
    expect(screen.getByText(/Daftar Rental —/)).toBeInTheDocument();
    expect(screen.getByText('B 1000 XYZ')).toBeInTheDocument();
    expect(screen.getByText('B 1001 XYZ')).toBeInTheDocument();
    expect(screen.getByText('B 2000 GRB')).toBeInTheDocument();
    expect(screen.getByText('Andi Saputra')).toBeInTheDocument();
  });

  it('creates a rental via the dialog (COGS auto-picked from the plate type) and refreshes the list', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('B 1000 XYZ');

    await user.click(screen.getByRole('button', { name: /Tambah Rental Data/i }));
    const dialog = await screen.findByRole('dialog');

    // plate picker (registered plates from /partner/portal/plates)
    await user.click(within(dialog).getByLabelText('Plat'));
    await user.click(await screen.findByRole('option', { name: /B 1000 XYZ/ }));

    // picking the BYD M6 plate auto-selects the m6_cloud COGS preset
    await waitFor(() =>
      expect(within(dialog).getByText(/COGS dipakai:/)).toBeInTheDocument(),
    );

    fireEvent.change(within(dialog).getByLabelText('Tanggal Mulai'), {
      target: { value: isoDay(20) },
    });
    fireEvent.change(within(dialog).getByLabelText('Tanggal Selesai'), {
      target: { value: isoDay(22) },
    });
    await user.type(within(dialog).getByLabelText('Harga'), '750000');

    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    // dialog closes and the list refetches with the new row (plate now twice)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText('B 1000 XYZ')).toHaveLength(2));
  });

  it('filters the plate list from the search box inside the picker', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('B 1000 XYZ');

    await user.click(screen.getByRole('button', { name: /Tambah Rental Data/i }));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByLabelText('Plat'));
    // all 3 seeded plates listed before filtering
    expect(await screen.findAllByRole('option')).toHaveLength(3);

    await user.type(screen.getByLabelText('Cari plat'), '2000grb');
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    expect(screen.getByRole('option', { name: /B 2000 GRB/ })).toBeInTheDocument();

    // no match → empty state, no options
    await user.clear(screen.getByLabelText('Cari plat'));
    await user.type(screen.getByLabelText('Cari plat'), 'ZZZ999');
    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
    expect(screen.getByText(/Tidak ada plat yang cocok/)).toBeInTheDocument();
  });

  it('does not render a Region field in the add/edit dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('B 1000 XYZ');

    await user.click(screen.getByRole('button', { name: /Tambah Rental Data/i }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).queryByLabelText('Region')).not.toBeInTheDocument();
    // the page-level Region FILTER stays (it operates on existing data)
    expect(screen.getByLabelText('Region')).toBeInTheDocument();
  });

  it('blocks submit when tanggal selesai is before tanggal mulai', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('B 1000 XYZ');

    await user.click(screen.getByRole('button', { name: /Tambah Rental Data/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('Tanggal Mulai'), {
      target: { value: isoDay(20) },
    });
    fireEvent.change(within(dialog).getByLabelText('Tanggal Selesai'), {
      target: { value: isoDay(18) },
    });

    expect(
      await within(dialog).findByText('Tanggal selesai harus sama atau setelah tanggal mulai.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Simpan' })).toBeDisabled();
  });

  it('toggles payment status from the badge dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('1 transaksi belum dibayar');

    // B 1001 XYZ is the unpaid seed row
    await user.click(screen.getByRole('button', { name: 'Ubah status bayar B 1001 XYZ' }));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByLabelText('Status Bayar'));
    await user.click(await screen.findByRole('option', { name: 'Sudah Dibayar' }));
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // summary refreshes: nothing unpaid anymore
    await waitFor(() =>
      expect(screen.getByText('0 transaksi belum dibayar')).toBeInTheDocument(),
    );
  });

  it('deletes a rental after the confirm dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('B 2000 GRB');

    await user.click(screen.getByRole('button', { name: 'Hapus rental B 2000 GRB' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Hapus' }));

    await waitFor(() => expect(screen.queryByText('B 2000 GRB')).not.toBeInTheDocument());
  });
});
