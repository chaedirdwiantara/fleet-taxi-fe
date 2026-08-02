import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { RentalMonitoringPage } from './RentalMonitoringPage';
import { rentalSearchSchema, type RentalSearch } from './searchSchema';
import { matchCogsKey } from './cogsMatcher';
import { resetPartnerPlates, resetPartnerRentals } from '@/mocks/handlers';
import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';

// compressImage re-encodes through createImageBitmap + canvas, neither of
// which jsdom implements. These tests are about the upload gating, not the
// re-encoding, so the compressor is stubbed to pass the blob through.
vi.mock('@/features/partner/checkpoint/compressImage', () => ({
  compressImage: (file: File | Blob) => Promise.resolve(file),
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

/**
 * Drives the uploader's file input directly. The input is `sr-only` rather
 * than hidden, but userEvent.upload still refuses it, so the change event is
 * dispatched with an explicit FileList.
 */
async function attachProof(
  container: HTMLElement,
  fileName: string,
  contentType = 'image/jpeg',
): Promise<void> {
  const input = within(container).getByLabelText('Pilih file bukti pembayaran') as HTMLInputElement;
  const file = new File(['proof-bytes'], fileName, { type: contentType });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(within(container).getByText(fileName)).toBeInTheDocument());
}

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

  it('shows PPN apart from revenue, and only on rows that carry it', async () => {
    renderPage();
    await screen.findByText('B 1000 XYZ');

    // Seeded PKP rows carry 11%; B 2000 GRB predates PKP (rate 0).
    // B 1000 XYZ: 4 hari x 900.000 + 100.000 = DPP 3.700.000 -> PPN 407.000
    expect(screen.getByText('inc. PPN Rp 407.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 4.107.000')).toBeInTheDocument();

    // The untaxed row shows its total with no PPN caption.
    const untaxedRow = screen.getByText('B 2000 GRB').closest('tr')!;
    expect(within(untaxedRow).queryByText(/inc\. PPN/)).not.toBeInTheDocument();

    // VAT is reported on its own card, never folded into the revenue figures.
    expect(screen.getByText('PPN Terutang')).toBeInTheDocument();
  });

  it('turns PPN off for future rentals via the settings dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('B 1000 XYZ');

    await user.click(screen.getByRole('button', { name: /Atur PPN/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Partner berstatus PKP')).toBeChecked();
    // Nothing edited yet — there is nothing to submit.
    expect(within(dialog).getByRole('button', { name: 'Simpan' })).toBeDisabled();
    expect(
      within(dialog).getByText(/tidak menulis ulang invoice yang sudah terbit/i),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByLabelText('Partner berstatus PKP'));
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    // Existing rows keep the rate they were billed at — nothing is rewritten.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('inc. PPN Rp 407.000')).toBeInTheDocument();
  });

  it('offers the invoice shortcut on settled rentals only, and downloads the PDF', async () => {
    const user = userEvent.setup();
    // jsdom implements neither object URLs nor anchor navigation.
    const createObjectURL = vi.fn(() => 'blob:invoice');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {});

    renderPage();
    await screen.findByText('B 1000 XYZ');

    // seeds: B 1000 XYZ + B 2000 GRB are paid, B 1001 XYZ is not
    expect(screen.getByRole('button', { name: 'Unduh invoice B 1000 XYZ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unduh invoice B 2000 GRB' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Unduh invoice B 1001 XYZ' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unduh invoice B 1000 XYZ' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    const anchor = click.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^invoice-\d{4}-\d{2}-00001\.pdf$/);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:invoice');

    click.mockRestore();
    vi.unstubAllGlobals();
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
    await waitFor(() => expect(within(dialog).getByText(/COGS dipakai:/)).toBeInTheDocument());

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

  it('blocks marking a rental paid until evidence is attached, then saves', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('1 transaksi belum dibayar');

    // B 1001 XYZ is the unpaid seed row
    await user.click(screen.getByRole('button', { name: 'Ubah status bayar B 1001 XYZ' }));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByLabelText('Status Bayar'));
    await user.click(await screen.findByRole('option', { name: 'Sudah Dibayar' }));

    // Status alone is not enough — the uploader appears and Simpan stays locked.
    expect(within(dialog).getByText('0 / 5 file')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Simpan' })).toBeDisabled();

    await attachProof(dialog, 'bukti-transfer.jpg');
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Simpan' })).toBeEnabled(),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // summary refreshes: nothing unpaid anymore
    await waitFor(() => expect(screen.getByText('0 transaksi belum dibayar')).toBeInTheDocument());
  });

  it('shows who uploaded each existing proof and keeps them after a revert', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('B 1000 XYZ');

    // The paid seed row advertises its evidence count in the table.
    expect(screen.getByText('2 bukti')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ubah status bayar B 1000 XYZ' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('bukti-transfer-bca.jpg')).toBeInTheDocument();
    expect(within(dialog).getByText('invoice-rental.pdf')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Diunggah oleh/)).toHaveLength(2);
    expect(within(dialog).getAllByText('Partner Bhisa')).toHaveLength(2);

    // Reverting keeps the evidence — it is the payment's history.
    await user.click(within(dialog).getByLabelText('Status Bayar'));
    await user.click(await screen.findByRole('option', { name: 'Belum Dibayar' }));
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('2 transaksi belum dibayar')).toBeInTheDocument());
    expect(screen.getByText('2 bukti')).toBeInTheDocument();
  });

  it('stops accepting files once the 5-file cap is reached', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('1 transaksi belum dibayar');

    await user.click(screen.getByRole('button', { name: 'Ubah status bayar B 1001 XYZ' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText('Status Bayar'));
    await user.click(await screen.findByRole('option', { name: 'Sudah Dibayar' }));

    for (let i = 1; i <= 5; i += 1) {
      await attachProof(dialog, `bukti-${i}.jpg`);
      await waitFor(() => expect(within(dialog).getByText(`${i} / 5 file`)).toBeInTheDocument());
    }

    // At the cap the picker is gone entirely — nothing left to click.
    expect(within(dialog).queryByLabelText('Pilih file bukti pembayaran')).not.toBeInTheDocument();
  });

  it('creates a paid rental from the form with evidence attached', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('B 1000 XYZ');

    await user.click(screen.getByRole('button', { name: /Tambah Rental Data/ }));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByLabelText('Plat'));
    await user.click(await screen.findByRole('option', { name: /B 1000 XYZ/ }));
    // this plate's type auto-picks a COGS preset, which submit requires
    await waitFor(() => expect(within(dialog).getByText(/COGS dipakai:/)).toBeInTheDocument());
    fireEvent.change(within(dialog).getByLabelText('Tanggal Mulai'), {
      target: { value: isoDay(20) },
    });
    fireEvent.change(within(dialog).getByLabelText('Tanggal Selesai'), {
      target: { value: isoDay(22) },
    });
    fireEvent.change(within(dialog).getByLabelText('Harga'), { target: { value: '750000' } });

    // Choosing paid reveals the uploader inside the form and locks Simpan.
    await user.click(within(dialog).getByLabelText('Status Bayar'));
    await user.click(await screen.findByRole('option', { name: 'Sudah Dibayar' }));
    expect(within(dialog).getByRole('button', { name: 'Simpan' })).toBeDisabled();

    await attachProof(dialog, 'bukti-form.pdf', 'application/pdf');
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Simpan' })).toBeEnabled(),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The new paid row lands with its evidence: the B 2000 GRB seed already
    // shows "1 bukti", so a second one proves the form's proof reached the API.
    await waitFor(() => expect(screen.getAllByText('1 bukti')).toHaveLength(2));
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
