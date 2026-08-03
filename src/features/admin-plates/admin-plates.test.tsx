import { describe, it, expect, beforeEach } from 'vitest';
import { render, renderHook, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AdminPlateRegistrationPage } from './AdminPlateRegistrationPage';
import { useAdminPlatesQuery, useRegisterAdminPlate, useDeleteAdminPlate } from './hooks';
import { setSessionUser, resetAdminPlates, resetPartnerPlates } from '@/mocks/handlers';
import { adminMe, superAdminMe } from '@/mocks/fixtures/partner';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

beforeEach(() => {
  resetAdminPlates();
  resetPartnerPlates();
  setSessionUser(superAdminMe);
});

describe('Plate Registration — the admin console’s own registry', () => {
  it('lists the admin registrations, resolving who registered the same plate', async () => {
    const { result } = renderHook(() => useAdminPlatesQuery(), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // seeded: a plate no partner registered and no typed label
    const seeded = result.current.data!.find((p) => p.plateNumberNorm === 'B1003XYZ')!;
    expect(seeded.partnerName).toBeNull();
    expect(seeded.registeredPartnerName).toBeNull();
  });

  it('reports the claiming partner separately from the typed name', async () => {
    const { result } = renderHook(() => useRegisterAdminPlate(), {
      wrapper: wrapperFor(makeClient()),
    });
    let created!: { partnerName: string | null; registeredPartnerName: string | null };
    await act(async () => {
      // B1000XYZ is in the partner's Daftarkan Plat seed
      created = await result.current.mutateAsync({ plateNumber: 'b 1000 xyz' });
    });
    expect(created.partnerName).toBeNull(); // nothing typed
    expect(created.registeredPartnerName).toBe('Bhisa Shuttle');
  });

  it('stores the typed partner name independently of any registration', async () => {
    const { result } = renderHook(() => useRegisterAdminPlate(), {
      wrapper: wrapperFor(makeClient()),
    });
    let created!: { partnerName: string | null; registeredPartnerName: string | null };
    await act(async () => {
      created = await result.current.mutateAsync({
        plateNumber: 'B 1006 XYZ',
        partnerName: 'CV Armada Mandiri',
      });
    });
    expect(created.partnerName).toBe('CV Armada Mandiri');
    expect(created.registeredPartnerName).toBeNull(); // no partner claimed it
  });

  it('registers (normalizing) and rejects duplicates + blanks', async () => {
    const { result } = renderHook(() => useRegisterAdminPlate(), {
      wrapper: wrapperFor(makeClient()),
    });

    let created!: { plateNumberNorm: string };
    await act(async () => {
      created = await result.current.mutateAsync({
        plateNumber: 'b 1004 xyz',
        vehicleType: 'Innova',
      });
    });
    expect(created.plateNumberNorm).toBe('B1004XYZ');

    await act(async () => {
      await expect(result.current.mutateAsync({ plateNumber: 'B1004XYZ' })).rejects.toMatchObject({
        code: 'CONFLICT',
      });
      await expect(result.current.mutateAsync({ plateNumber: '   ' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
    });
  });

  it('deletes a registration', async () => {
    const { result } = renderHook(() => useDeleteAdminPlate(), {
      wrapper: wrapperFor(makeClient()),
    });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    const { result: list } = renderHook(() => useAdminPlatesQuery(), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(list.current.isSuccess).toBe(true));
    expect(list.current.data!.map((p) => p.id)).not.toContain(1);
  });

  it('is refused to a plain admin, at the endpoint and on the page', async () => {
    setSessionUser(adminMe);
    const { result } = renderHook(() => useAdminPlatesQuery(), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: 'FORBIDDEN' });

    render(<AdminPlateRegistrationPage />, { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(screen.getByText('Akses ditolak')).toBeInTheDocument());
  });
});

describe('Plate Registration page (super_admin)', () => {
  it('adds a plate with a typed partner name and clears the form', async () => {
    const user = userEvent.setup();
    render(<AdminPlateRegistrationPage />, { wrapper: wrapperFor(makeClient()) });

    await waitFor(() => expect(screen.getByText('Plate Registration')).toBeInTheDocument());
    // admin-only column + field, absent on the partner screen
    expect(screen.getByRole('columnheader', { name: 'Partner' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('B 1003 XYZ')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Nomor Plat'), 'B 1005 XYZ');
    await user.type(screen.getByLabelText('Type (opsional)'), 'Premium - BYD M6');
    await user.type(screen.getByLabelText('Nama Partner (opsional)'), 'CV Armada Mandiri');
    await user.click(screen.getByRole('button', { name: /Tambah/i }));

    await waitFor(() => expect(screen.getByText('B 1005 XYZ')).toBeInTheDocument());
    expect(screen.getByText('CV Armada Mandiri')).toBeInTheDocument();
    // the form clears itself for the next entry
    expect(screen.getByLabelText('Nomor Plat')).toHaveValue('');
    expect(screen.getByLabelText('Nama Partner (opsional)')).toHaveValue('');
  });

  it('falls back to the claiming partner when no name was typed', async () => {
    const user = userEvent.setup();
    render(<AdminPlateRegistrationPage />, { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(screen.getByText('Plate Registration')).toBeInTheDocument());

    // B1000XYZ is registered by the mock partner, and we type no name for it
    await user.type(screen.getByLabelText('Nomor Plat'), 'B 1000 XYZ');
    await user.click(screen.getByRole('button', { name: /Tambah/i }));

    await waitFor(() => expect(screen.getByText('Bhisa Shuttle')).toBeInTheDocument());
    expect(screen.getByText('Bhisa Shuttle')).toHaveAttribute(
      'title',
      'Dari registrasi partner di portalnya',
    );
  });

  it('refuses to submit an empty plate number', async () => {
    const user = userEvent.setup();
    render(<AdminPlateRegistrationPage />, { wrapper: wrapperFor(makeClient()) });

    await waitFor(() => expect(screen.getByText('Plate Registration')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Tambah/i }));

    expect(await screen.findByText('Nomor plat wajib diisi')).toBeInTheDocument();
  });
});
