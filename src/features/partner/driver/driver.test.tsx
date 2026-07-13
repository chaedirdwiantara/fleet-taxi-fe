import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { DriversPage } from './DriversPage';
import { RegistrationDetailPage } from './RegistrationDetailPage';
import { RegistrationsPage } from './RegistrationsPage';
import { ResignationDetailPage } from './ResignationDetailPage';
import { useResignationsQuery } from './hooks';
import {
  driverSearchSchema,
  registrationSearchSchema,
  type DriverSearch,
  type RegistrationSearch,
} from './searchSchema';
import { resetDrivers, resetPartnerPlates } from '@/mocks/handlers';

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

// The routes normally own URL search state + navigation; these harnesses
// emulate them so the pages round-trip like navigate({ search }) would.
function RegistrationsHarness({
  onOpenDetail = () => {},
  initialPage = 1,
}: {
  onOpenDetail?: (id: number) => void;
  initialPage?: number;
}) {
  const [search, setSearch] = useState<RegistrationSearch>(() => ({
    ...registrationSearchSchema.parse({}),
    page: initialPage,
  }));
  return (
    <RegistrationsPage
      search={search}
      onPatch={(patch) => setSearch((prev) => ({ ...prev, ...patch }))}
      onOpenDetail={onOpenDetail}
    />
  );
}

function DriversHarness() {
  const [search, setSearch] = useState<DriverSearch>(() => driverSearchSchema.parse({}));
  return (
    <DriversPage
      search={search}
      onPatch={(patch) => setSearch((prev) => ({ ...prev, ...patch }))}
      onOpenDetail={() => {}}
    />
  );
}

beforeEach(() => {
  resetDrivers();
  resetPartnerPlates();
});

describe('Registrasi Driver — list + create', () => {
  it('renders the registrations from fixtures with status badges', async () => {
    render(<RegistrationsHarness />, { wrapper: wrapperFor(makeClient()) });

    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('Joko Widodo')).toBeInTheDocument();
    // approved/resigned rows never show in the registration slice
    expect(screen.queryByText('Agus Salim')).not.toBeInTheDocument();
    expect(screen.getAllByText('Menunggu Verifikasi').length).toBeGreaterThan(0);
    // Joko's deposit is already approved; Budi still has none
    expect(screen.getByText('Menunggu Deposit')).toBeInTheDocument();
    expect(screen.getByText('Disetujui')).toBeInTheDocument();
  });

  it('creates a registration via the dialog and refreshes the list', async () => {
    const user = userEvent.setup();
    render(<RegistrationsHarness />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByText('Budi Santoso');

    await user.click(screen.getByRole('button', { name: /Tambah Registrasi/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nama'), 'Siti Aminah');
    await user.type(within(dialog).getByLabelText('Telepon'), '0812000111');
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Siti Aminah')).toBeInTheDocument();
  });

  it('deletes a registration after the confirm dialog', async () => {
    const user = userEvent.setup();
    render(<RegistrationsHarness />, { wrapper: wrapperFor(makeClient()) });
    await screen.findByText('Budi Santoso');

    await user.click(screen.getByRole('button', { name: 'Hapus registrasi Budi Santoso' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Hapus' }));

    await waitFor(() => expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument());
  });

  it('snaps back to the last page when the current page ends up out of range', async () => {
    // The fixtures fit on one page, so landing on page 2 yields zero rows —
    // the page should self-correct instead of showing an empty list.
    render(<RegistrationsHarness initialPage={2} />, { wrapper: wrapperFor(makeClient()) });

    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
  });
});

describe('Halaman verifikasi — server preconditions mirrored client-side', () => {
  it('disables Terima with helper text while deposit/dokumen belum lengkap', async () => {
    render(<RegistrationDetailPage id={1} onBack={() => {}} onApproved={() => {}} />, {
      wrapper: wrapperFor(makeClient()),
    });

    expect(await screen.findByText('Verifikasi Driver')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Terima/ })).toBeDisabled();
    expect(
      screen.getByText(/deposit belum disetujui/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/harus terverifikasi/i)).toBeInTheDocument();
  });

  it('enables Terima once deposit approved + all docs verified, and approval hands off', async () => {
    const user = userEvent.setup();
    const onApproved = vi.fn();
    render(<RegistrationDetailPage id={2} onBack={() => {}} onApproved={onApproved} />, {
      wrapper: wrapperFor(makeClient()),
    });

    const approve = await screen.findByRole('button', { name: /Terima/ });
    expect(approve).toBeEnabled();
    await user.click(approve);
    await waitFor(() => expect(onApproved).toHaveBeenCalled());
  });

  it('rejects with a note via the Tolak dialog', async () => {
    const user = userEvent.setup();
    render(<RegistrationDetailPage id={1} onBack={() => {}} onApproved={() => {}} />, {
      wrapper: wrapperFor(makeClient()),
    });
    await screen.findByText('Verifikasi Driver');

    await user.click(screen.getByRole('button', { name: /^Tolak$/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Alasan Penolakan'), 'Dokumen tidak jelas');
    await user.click(within(dialog).getByRole('button', { name: 'Tolak Registrasi' }));

    await waitFor(() =>
      expect(screen.getByText(/Registrasi ditolak — Dokumen tidak jelas/)).toBeInTheDocument(),
    );
  });
});

describe('Daftar Driver', () => {
  it('renders active drivers with driver code and badges', async () => {
    render(<DriversHarness />, { wrapper: wrapperFor(makeClient()) });

    expect(await screen.findByText('Agus Salim')).toBeInTheDocument();
    expect(screen.getByText('DRV-000010')).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    // resigned/pending rows never show in the roster
    expect(screen.queryByText('Tono Sucipto')).not.toBeInTheDocument();
    expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
  });

  it('resigns a driver after the confirm dialog and moves them to resignations', async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(<DriversHarness />, { wrapper: wrapperFor(client) });
    await screen.findByText('Agus Salim');

    await user.click(screen.getByRole('button', { name: 'Resign driver Agus Salim' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(
      within(confirm).getByText(/akan dipindahkan ke Driver Resign/),
    ).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Resign' }));

    await waitFor(() => expect(screen.queryByText('Agus Salim')).not.toBeInTheDocument());

    // fixture-level: the row now lives in the resignation slice
    const { result } = renderHook(() => useResignationsQuery({ page: 1 }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.rows.map((r) => r.name)).toContain('Agus Salim');
  });
});

describe('Pengembalian deposit — resignation detail', () => {
  it('approves a waiting deposit return and shows the decision audit line', async () => {
    const user = userEvent.setup();
    render(<ResignationDetailPage id={20} onBack={() => {}} />, {
      wrapper: wrapperFor(makeClient()),
    });

    expect(await screen.findByText(/Pengembalian Deposit — Tono Sucipto/)).toBeInTheDocument();
    // the seed deposit is Rp1.000.000, formatted — never computed — client-side
    expect(screen.getByText(/Rp\s?1\.000\.000/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Setujui Pengembalian/ }));
    // badge shows both in the header and the panel
    await waitFor(() => expect(screen.getAllByText('Dikembalikan')).not.toHaveLength(0));
    expect(screen.getByText(/Keputusan pengembalian:/)).toBeInTheDocument();
  });

  it('rejects a waiting deposit return', async () => {
    const user = userEvent.setup();
    render(<ResignationDetailPage id={20} onBack={() => {}} />, {
      wrapper: wrapperFor(makeClient()),
    });
    await screen.findByText(/Tono Sucipto/);

    await user.click(screen.getByRole('button', { name: /^Tolak$/ }));
    await waitFor(() => expect(screen.getAllByText('Ditolak')).not.toHaveLength(0));
  });
});
