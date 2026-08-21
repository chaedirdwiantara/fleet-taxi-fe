import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { DriversPage } from './DriversPage';
import { DriverEditPage } from './DriverEditPage';
import { ResignedDriversPage } from './ResignedDriversPage';
import {
  driverSearchSchema,
  resignedDriverSearchSchema,
  type DriverSearch,
  type ResignedDriverSearch,
} from './searchSchema';
import { reappearInImport, resetDrivers, resetPartnerPlates } from '@/mocks/handlers';

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

// The route normally owns URL search state + navigation; this harness
// emulates it so the page round-trips like navigate({ search }) would.
function DriversHarness({
  onOpenDetail = () => {},
  initialPage = 1,
}: {
  onOpenDetail?: (id: number) => void;
  initialPage?: number;
}) {
  const [search, setSearch] = useState<DriverSearch>(() => ({
    ...driverSearchSchema.parse({}),
    page: initialPage,
  }));
  return (
    <DriversPage
      search={search}
      onPatch={(patch) => setSearch((prev) => ({ ...prev, ...patch }))}
      onOpenDetail={onOpenDetail}
    />
  );
}

function ResignedHarness() {
  const [search, setSearch] = useState<ResignedDriverSearch>(() =>
    resignedDriverSearchSchema.parse({}),
  );
  return (
    <ResignedDriversPage
      search={search}
      onPatch={(patch) => setSearch((prev) => ({ ...prev, ...patch }))}
      onOpenDetail={() => {}}
    />
  );
}

// PDF skips the canvas-based client-side compression jsdom can't run.
const pdfFile = (name = 'bukti.pdf') =>
  new File(['%PDF-1.4 mock'], name, { type: 'application/pdf' });

beforeEach(() => {
  resetDrivers();
  resetPartnerPlates();
});

describe('Daftar Driver — synced roster list', () => {
  it('renders every driver (including resigned) with source badges', async () => {
    render(<DriversHarness />, { wrapper: wrapperFor(makeClient()) });

    expect(await screen.findByText('Agus Salim')).toBeInTheDocument();
    expect(screen.getByText('Dewi Lestari')).toBeInTheDocument();
    expect(screen.getByText('Rudi Hartono')).toBeInTheDocument();
    // resigned drivers stay in the roster, badged
    expect(screen.getByText('Tono Sucipto')).toBeInTheDocument();
    expect(screen.getAllByText('Resign').length).toBeGreaterThan(0);
    // a driver the import stopped carrying wears the detected "Keluar" badge
    expect(screen.getByText('Chandra Mata')).toBeInTheDocument();
    expect(screen.getByText(/^Keluar · /)).toBeInTheDocument();
    // source badges: gojek/grab synced + manual
    expect(screen.getAllByText('Gojek').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Grab').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Manual').length).toBeGreaterThan(0);
    expect(screen.getByText(/tersinkron otomatis dari Fleet Monitoring/i)).toBeInTheDocument();
  });

  it('filters by resign status via the select', async () => {
    const user = userEvent.setup();
    render(<DriversHarness />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByText('Agus Salim');

    await user.click(screen.getByRole('combobox', { name: 'Filter resign' }));
    await user.click(await screen.findByRole('option', { name: 'Resign / Keluar' }));

    await waitFor(() => expect(screen.queryByText('Agus Salim')).not.toBeInTheDocument());
    expect(screen.getByText('Tono Sucipto')).toBeInTheDocument();
    expect(screen.getByText('Sri Wahyuni')).toBeInTheDocument();
    // the detected exit belongs to the same list, without a manual resign
    expect(screen.getByText('Chandra Mata')).toBeInTheDocument();
  });

  it('snaps back to the last page when the current page ends up out of range', async () => {
    // The fixtures fit on one page, so landing on page 2 yields zero rows —
    // the page should self-correct instead of showing an empty list.
    render(<DriversHarness initialPage={2} />, { wrapper: wrapperFor(makeClient()) });

    expect(await screen.findByText('Agus Salim')).toBeInTheDocument();
  });
});

describe('Daftar Driver — pendaftaran manual', () => {
  it('registers a driver and hands the caller its id for the edit page', async () => {
    const user = userEvent.setup();
    const opened: number[] = [];
    render(<DriversHarness onOpenDetail={(id) => opened.push(id)} />, {
      wrapper: wrapperFor(makeClient()),
    });
    await screen.findByText('Agus Salim');

    await user.click(screen.getByRole('button', { name: 'Tambah Driver' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nama'), 'Joko Baru');
    await user.type(within(dialog).getByLabelText('Telepon'), '081200011122');
    await user.click(within(dialog).getByRole('button', { name: 'Simpan & Lengkapi' }));

    await waitFor(() => expect(opened).toHaveLength(1));
    // the fresh row is on the roster, marked as a manual entry
    expect(await screen.findByText('Joko Baru')).toBeInTheDocument();
    expect(screen.getAllByText('Manual').length).toBeGreaterThan(1);
  });

  it('blocks an empty name before hitting the API', async () => {
    const user = userEvent.setup();
    render(<DriversHarness />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByText('Agus Salim');

    await user.click(screen.getByRole('button', { name: 'Tambah Driver' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Simpan & Lengkapi' }));

    expect(await within(dialog).findByText('Nama wajib diisi')).toBeInTheDocument();
  });

  it('surfaces the CONFLICT error when the name already exists', async () => {
    const user = userEvent.setup();
    render(<DriversHarness />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByText('Agus Salim');

    await user.click(screen.getByRole('button', { name: 'Tambah Driver' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nama'), 'Agus Salim');
    await user.click(within(dialog).getByRole('button', { name: 'Simpan & Lengkapi' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nama driver sudah ada');
  });
});

describe('Driver Resign — daftar keluar armada', () => {
  it('lists both halves: ditandai manual dan terdeteksi keluar', async () => {
    render(<ResignedHarness />, { wrapper: wrapperFor(makeClient()) });

    expect(await screen.findByText('Chandra Mata')).toBeInTheDocument();
    expect(screen.getByText('Tono Sucipto')).toBeInTheDocument();
    expect(screen.getByText('Sri Wahyuni')).toBeInTheDocument();
    expect(screen.getAllByText('Ditandai Manual').length).toBe(2);
    expect(screen.getByText('Terdeteksi Keluar')).toBeInTheDocument();
    // drivers still on the roster never show up here
    expect(screen.queryByText('Agus Salim')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Driver yang muncul lagi di import terbaru otomatis keluar/i),
    ).toBeInTheDocument();
  });

  it('narrows to the automatically detected exits', async () => {
    const user = userEvent.setup();
    render(<ResignedHarness />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByText('Chandra Mata');

    await user.click(screen.getByRole('combobox', { name: 'Filter tipe resign' }));
    await user.click(await screen.findByRole('option', { name: 'Terdeteksi Keluar' }));

    await waitFor(() => expect(screen.queryByText('Tono Sucipto')).not.toBeInTheDocument());
    expect(screen.getByText('Chandra Mata')).toBeInTheDocument();
  });

  it('drops a detected driver once the roster sync sees them again', async () => {
    // The sync clears exitedAt server-side; the mock stands in for that import.
    reappearInImport(22);
    render(<ResignedHarness />, { wrapper: wrapperFor(makeClient()) });

    expect(await screen.findByText('Tono Sucipto')).toBeInTheDocument();
    expect(screen.queryByText('Chandra Mata')).not.toBeInTheDocument();
  });
});

describe('Halaman edit driver — informasi', () => {
  it('saves master-data edits via PATCH and refreshes the header', async () => {
    const user = userEvent.setup();
    render(<DriverEditPage id={11} onBack={() => {}} />, { wrapper: wrapperFor(makeClient()) });

    const name = await screen.findByLabelText('Nama');
    expect(name).toHaveValue('Dewi Lestari');

    const save = screen.getByRole('button', { name: 'Simpan' });
    expect(save).toBeDisabled(); // nothing dirty yet

    await user.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await user.clear(name);
    await user.type(name, 'Dewi Lestari Putri');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByRole('heading', { name: 'Dewi Lestari Putri' })).toBeInTheDocument();
    // baseline resets after a successful save
    await waitFor(() => expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled());
  });

  it('surfaces the CONFLICT error inline when the name is already taken', async () => {
    const user = userEvent.setup();
    render(<DriverEditPage id={11} onBack={() => {}} />, { wrapper: wrapperFor(makeClient()) });

    const name = await screen.findByLabelText('Nama');
    await user.clear(name);
    await user.type(name, 'Agus Salim');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nama driver sudah terdaftar');
  });
});

describe('Halaman edit driver — survey rumah', () => {
  it('opens the exact pin on the map when the house was surveyed', async () => {
    // Agus Salim carries an address, a pin and a survey photo.
    render(<DriverEditPage id={10} onBack={() => {}} />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByRole('heading', { name: 'Agus Salim' });

    expect(screen.getByRole('link', { name: /Buka di Peta/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=-6.229728,106.689399',
    );
    expect(screen.getByLabelText('Alamat Rumah')).toHaveValue('Jl. Anggrek No. 3, Bekasi');
    expect(screen.getByLabelText(/Titik Lokasi/)).toHaveValue('-6.229728, 106.689399');
    expect(screen.getByAltText('Pratinjau Foto Survey Rumah')).toBeInTheDocument();
  });

  it('falls back to searching the address when there is no pin', async () => {
    // Rudi Hartono has an address but no coordinates.
    render(<DriverEditPage id={12} onBack={() => {}} />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByRole('heading', { name: 'Rudi Hartono' });

    expect(screen.getByRole('link', { name: /Buka di Peta/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Jl.%20Melati%20No.%201%2C%20Jakarta%20Selatan',
    );
    expect(screen.getByLabelText(/Titik Lokasi/)).toHaveValue('');
  });

  it('accepts a pasted Google Maps link and saves the pin', async () => {
    const user = userEvent.setup();
    // Dewi Lestari starts with neither address nor pin.
    render(<DriverEditPage id={11} onBack={() => {}} />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByRole('heading', { name: 'Dewi Lestari' });
    expect(screen.queryByRole('link', { name: /Buka di Peta/ })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Alamat Rumah'), 'Jl. Kenanga No. 9');
    await user.type(
      screen.getByLabelText(/Titik Lokasi/),
      'https://www.google.com/maps/place/Rumah/@-6.175392,106.827153,17z',
    );
    await user.click(screen.getByRole('button', { name: 'Simpan Survey' }));

    expect(await screen.findByRole('link', { name: /Buka di Peta/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=-6.175392,106.827153',
    );
  });

  it('refuses to save an unreadable pin', async () => {
    const user = userEvent.setup();
    render(<DriverEditPage id={11} onBack={() => {}} />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByRole('heading', { name: 'Dewi Lestari' });

    await user.type(screen.getByLabelText(/Titik Lokasi/), 'dekat masjid');

    expect(await screen.findByText(/Titik tidak terbaca/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan Survey' })).toBeDisabled();
  });
});

describe('Halaman edit driver — resign & pengembalian deposit', () => {
  it('marks a driver resigned after the confirm dialog', async () => {
    const user = userEvent.setup();
    render(<DriverEditPage id={10} onBack={() => {}} />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByRole('heading', { name: 'Agus Salim' });

    await user.click(screen.getByRole('button', { name: 'Tandai Resign' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText(/akan ditandai resign dan dinonaktifkan/)).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Tandai Resign' }));

    expect(await screen.findByText('Resign')).toBeInTheDocument();
    expect(screen.getByText(/Resign sejak/)).toBeInTheDocument();
    expect(screen.getByText('Belum dikembalikan')).toBeInTheDocument();
  });

  it('gates the deposit-return switch on an uploaded proof', async () => {
    const user = userEvent.setup();
    // Sri Wahyuni: resigned, no deposit_return_proof yet.
    render(<DriverEditPage id={21} onBack={() => {}} />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByRole('heading', { name: 'Sri Wahyuni' });

    // client-side mirror of the BE gate: switch disabled + helper text
    expect(screen.getByRole('switch', { name: 'Deposit dikembalikan' })).toBeDisabled();
    expect(
      screen.getByText('Unggah bukti pengembalian deposit terlebih dahulu.'),
    ).toBeInTheDocument();

    // upload the proof, then the switch unlocks and the return goes through
    await user.upload(screen.getByLabelText('Pilih file Bukti Pengembalian Deposit'), pdfFile());
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Deposit dikembalikan' })).toBeEnabled(),
    );
    await user.click(screen.getByRole('switch', { name: 'Deposit dikembalikan' }));

    expect(await screen.findByText(/^Dikembalikan/)).toBeInTheDocument();
    expect(screen.getByText(/tercatat sudah dikembalikan/)).toBeInTheDocument();
  });

  it('records the deposit return when the proof is already uploaded', async () => {
    const user = userEvent.setup();
    // Tono Sucipto: resigned with an uploaded proof.
    render(<DriverEditPage id={20} onBack={() => {}} />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByRole('heading', { name: 'Tono Sucipto' });

    const toggle = screen.getByRole('switch', { name: 'Deposit dikembalikan' });
    expect(toggle).toBeEnabled();
    await user.click(toggle);

    expect(await screen.findByText(/^Dikembalikan/)).toBeInTheDocument();
  });

  it('un-resigns a driver and resets the deposit-return state', async () => {
    const user = userEvent.setup();
    render(<DriverEditPage id={20} onBack={() => {}} />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByRole('heading', { name: 'Tono Sucipto' });

    await user.click(screen.getByRole('button', { name: 'Batalkan Resign' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(
      within(confirm).getByText(/status pengembalian deposit akan\s+direset/),
    ).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Batalkan Resign' }));

    // back to the pre-resign card: the resign CTA returns, return UI goes away
    expect(await screen.findByRole('button', { name: 'Tandai Resign' })).toBeInTheDocument();
    expect(screen.queryByText('Resign')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Deposit dikembalikan' })).not.toBeInTheDocument();
  });
});
