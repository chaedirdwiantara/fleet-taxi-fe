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
    // seeded: a plate no partner registered → no partner name
    expect(result.current.data!.map((p) => p.plateNumberNorm)).toContain('B1003XYZ');
    expect(result.current.data!.find((p) => p.plateNumberNorm === 'B1003XYZ')!.partnerName).toBe(
      null,
    );
  });

  it('names the partner when one registered the same plate in its own portal', async () => {
    const { result } = renderHook(() => useRegisterAdminPlate(), {
      wrapper: wrapperFor(makeClient()),
    });
    let created!: { partnerName: string | null };
    await act(async () => {
      // B1000XYZ is in the partner's Daftarkan Plat seed
      created = await result.current.mutateAsync({ plateNumber: 'b 1000 xyz' });
    });
    expect(created.partnerName).toBe('Bhisa Shuttle');
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
  it('shows the Partner column and adds a plate through the form', async () => {
    const user = userEvent.setup();
    render(<AdminPlateRegistrationPage />, { wrapper: wrapperFor(makeClient()) });

    await waitFor(() => expect(screen.getByText('Plate Registration')).toBeInTheDocument());
    // admin-only column, absent on the partner screen
    expect(screen.getByRole('columnheader', { name: 'Partner' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('B 1003 XYZ')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Nomor Plat'), 'B 1005 XYZ');
    await user.type(screen.getByLabelText('Type (opsional)'), 'Premium - BYD M6');
    await user.click(screen.getByRole('button', { name: /Tambah/i }));

    await waitFor(() => expect(screen.getByText('B 1005 XYZ')).toBeInTheDocument());
    // the form clears itself for the next entry
    expect(screen.getByLabelText('Nomor Plat')).toHaveValue('');
  });

  it('refuses to submit an empty plate number', async () => {
    const user = userEvent.setup();
    render(<AdminPlateRegistrationPage />, { wrapper: wrapperFor(makeClient()) });

    await waitFor(() => expect(screen.getByText('Plate Registration')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Tambah/i }));

    expect(await screen.findByText('Nomor plat wajib diisi')).toBeInTheDocument();
  });
});
