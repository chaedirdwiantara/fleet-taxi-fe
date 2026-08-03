import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { PlateRegistry } from './PlateRegistry';
import {
  useDeletePlate,
  usePartnerPlatesQuery,
  useRegisterPlate,
  useUpdatePlate,
} from '@/features/partner/hooks';
import type { PartnerPlate } from '@/features/partner/types';
import { resetPartnerPlates } from '@/mocks/handlers';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

beforeEach(() => resetPartnerPlates());

// The partner portal's "Daftarkan Plat" mounted on the shared screen: same
// component the admin console uses, without the admin-only Partner column.
function DaftarkanPlat() {
  const list = usePartnerPlatesQuery();
  const register = useRegisterPlate();
  const update = useUpdatePlate();
  const remove = useDeletePlate();
  return (
    <PlateRegistry<PartnerPlate>
      title="Daftarkan Plat"
      description="Daftarkan nomor plat kendaraan Anda."
      emptyDescription="Tambahkan plat pertama Anda di atas."
      controller={{ list, register, update, remove }}
    />
  );
}

describe('Daftarkan Plat — the partner side of the shared screen', () => {
  it('lists the partner’s plates without an admin Partner column', async () => {
    render(<DaftarkanPlat />, { wrapper: wrapperFor(makeClient()) });

    await waitFor(() => expect(screen.getByText('B 1000 XYZ')).toBeInTheDocument());
    expect(screen.getByRole('columnheader', { name: 'Nomor Plat' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Partner' })).not.toBeInTheDocument();
    // and no plate from the admin registry leaks in
    expect(screen.queryByText('B 1003 XYZ')).not.toBeInTheDocument();
  });

  it('adds a plate and clears the form', async () => {
    const user = userEvent.setup();
    render(<DaftarkanPlat />, { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(screen.getByText('B 1000 XYZ')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Nomor Plat'), 'B 1002 XYZ');
    await user.click(screen.getByRole('button', { name: /Tambah/i }));

    await waitFor(() => expect(screen.getByText('B 1002 XYZ')).toBeInTheDocument());
    expect(screen.getByLabelText('Nomor Plat')).toHaveValue('');
  });

  it('edits a plate through the dialog', async () => {
    const user = userEvent.setup();
    render(<DaftarkanPlat />, { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(screen.getByText('B 1000 XYZ')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Edit B 1000 XYZ' }));
    const dialog = await screen.findByRole('dialog');
    const typeField = within(dialog).getByLabelText('Type (opsional)');
    await user.clear(typeField);
    await user.type(typeField, 'Reguler - Avanza');
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText('Reguler - Avanza').length).toBeGreaterThan(1));
  });
});
