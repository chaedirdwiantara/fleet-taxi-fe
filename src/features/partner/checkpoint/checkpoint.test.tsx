import { describe, it, expect, beforeEach } from 'vitest';
import { render, renderHook, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { CompletionCard } from './CompletionCard';
import { HandoverPartyFields } from './HandoverPartyFields';
import {
  useCheckpointQuery,
  useCheckpointsQuery,
  useComparisonQuery,
  useCompleteCheckpoint,
  useCreateCheckpoint,
  useDeleteCheckpoint,
  useUpdatePoint,
} from './hooks';
import {
  checkpointProgress,
  handoverSides,
  toPartyFields,
  type CheckpointDetail,
  type HandoverPartyNames,
  type HandoverType,
} from './types';
import { resetCheckpoints, resetDrivers, resetPartnerPlates } from '@/mocks/handlers';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

beforeEach(() => {
  resetPartnerPlates();
  resetCheckpoints();
  resetDrivers();
});

describe('checkpoint — dokumentasi serah terima', () => {
  it('lists checkpoints with pagination meta and photo counts', async () => {
    const { result } = renderHook(() => useCheckpointsQuery({ page: 1 }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.meta?.total).toBe(2);
    const completed = result.current.data!.rows.find((c) => c.status === 'completed');
    expect(completed?.photoCount).toBe(10);
  });

  it('filters by status', async () => {
    const { result } = renderHook(() => useCheckpointsQuery({ page: 1, status: 'draft' }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.rows).toHaveLength(1);
    expect(result.current.data!.rows[0]!.status).toBe('draft');
  });

  it('searches by partial plate and filters by WIB month/year', async () => {
    // "1000" is a fragment of B1000XYZ — partial match must find both seeds
    const { result: partial } = renderHook(() => useCheckpointsQuery({ page: 1, plate: '1000' }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(partial.current.isSuccess).toBe(true));
    expect(partial.current.data!.meta?.total).toBe(2);

    const { result: none } = renderHook(() => useCheckpointsQuery({ page: 1, plate: 'ZZZ' }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(none.current.isSuccess).toBe(true));
    expect(none.current.data!.meta?.total).toBe(0);

    // Both seeds are July 2026 (WIB); June must be empty
    const { result: june } = renderHook(
      () => useCheckpointsQuery({ page: 1, month: 6, year: 2026 }),
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(june.current.isSuccess).toBe(true));
    expect(june.current.data!.meta?.total).toBe(0);

    const { result: july } = renderHook(
      () => useCheckpointsQuery({ page: 1, month: 7, year: 2026 }),
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(july.current.isSuccess).toBe(true));
    expect(july.current.data!.meta?.total).toBe(2);
  });

  it('creates a draft with the 10-point template; rejects unregistered plates', async () => {
    const { result } = renderHook(() => useCreateCheckpoint(), {
      wrapper: wrapperFor(makeClient()),
    });

    let created!: { id: number; points: unknown[]; status: string };
    await act(async () => {
      created = await result.current.mutateAsync({
        plateNumber: 'B 1001 XYZ',
        handoverType: 'delivery_to_driver',
      });
    });
    expect(created.status).toBe('draft');
    expect(created.points).toHaveLength(10);

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          plateNumber: 'Z 9999 ZZ',
          handoverType: 'delivery_to_customer',
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  it('updates a point (pass/fail + note) and patches the cached detail', async () => {
    const client = makeClient();
    const { result: detail } = renderHook(() => useCheckpointQuery(2), {
      wrapper: wrapperFor(client),
    });
    // access .data so react-query tracks it (re-renders on setQueryData patches)
    await waitFor(() => expect(detail.current.data?.points).toHaveLength(10));

    const { result: update } = renderHook(() => useUpdatePoint(2), {
      wrapper: wrapperFor(client),
    });
    await act(async () => {
      await update.current.mutateAsync({
        pointKey: 'exterior_front',
        passed: false,
        note: 'Baret di bumper',
      });
    });
    await waitFor(() => {
      const point = detail.current.data!.points.find((p) => p.pointKey === 'exterior_front');
      expect(point?.passed).toBe(false);
      expect(point?.note).toBe('Baret di bumper');
    });
  });

  it('refuses to complete an incomplete draft, reporting what is missing', async () => {
    const { result } = renderHook(() => useCompleteCheckpoint(2), {
      wrapper: wrapperFor(makeClient()),
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ odometerKm: 16000, batteryPercent: 40 }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
    await waitFor(() => {
      const err = result.current.error as { details?: { field: string; message: string }[] } | null;
      // 10 unassessed + 10 photoless + 2 signatures
      expect(err?.details).toHaveLength(22);
      // Seed 2 is a return: the counterpart hands over, the partner receives
      expect(err?.details?.find((d) => d.field === 'signature_counterpart')?.message).toBe(
        'Tanda tangan penyerah (Customer) belum ada',
      );
      expect(err?.details?.find((d) => d.field === 'signature_partner')?.message).toBe(
        'Tanda tangan penerima (Petugas Partner) belum ada',
      );
    });
  });

  it('deletes a draft but refuses a completed checkpoint', async () => {
    const { result: remove } = renderHook(() => useDeleteCheckpoint(), {
      wrapper: wrapperFor(makeClient()),
    });
    // seed id 2 = draft → deletable
    await act(async () => {
      await remove.current.mutateAsync(2);
    });
    const { result: list } = renderHook(() => useCheckpointsQuery({ page: 1 }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(list.current.isSuccess).toBe(true));
    expect(list.current.data!.meta?.total).toBe(1);

    // seed id 1 = completed berita acara → 409
    await act(async () => {
      await expect(remove.current.mutateAsync(1)).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  it('pairs a return checkpoint with its completed delivery for comparison', async () => {
    const { result } = renderHook(() => useComparisonQuery(2, true), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(1);
    expect(result.current.data?.handoverType).toBe('delivery_to_customer');

    // A delivery checkpoint has nothing to compare against
    const { result: none } = renderHook(() => useComparisonQuery(1, true), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(none.current.isSuccess).toBe(true));
    expect(none.current.data).toBeNull();
  });
});

describe('checkpoint — penyerah & penerima', () => {
  it('derives both sides from the handover direction', () => {
    const [deliveryGiver, deliveryReceiver] = handoverSides('delivery_to_driver');
    expect(deliveryGiver.party).toBe('partner');
    expect(deliveryGiver.partyLabel).toBe('Petugas Partner');
    expect(deliveryGiver.fromDriverRoster).toBe(false);
    expect(deliveryReceiver.party).toBe('counterpart');
    expect(deliveryReceiver.partyLabel).toBe('Driver');
    expect(deliveryReceiver.fromDriverRoster).toBe(true);
    expect(deliveryReceiver.signatureKind).toBe('signature_counterpart');

    // A return flips who hands over — and moves the roster picker with it
    const [returnGiver, returnReceiver] = handoverSides('return_from_driver');
    expect(returnGiver.party).toBe('counterpart');
    expect(returnGiver.fromDriverRoster).toBe(true);
    expect(returnReceiver.party).toBe('partner');
    expect(returnReceiver.fromDriverRoster).toBe(false);

    // Only driver handovers use the roster; customers are typed free-hand
    expect(handoverSides('delivery_to_customer')[1].fromDriverRoster).toBe(false);
    expect(handoverSides('delivery_to_customer')[1].partyLabel).toBe('Customer');
  });

  it('maps the role-keyed form values onto the party fields the API stores', () => {
    const names: HandoverPartyNames = {
      giverName: 'Andi Pratama',
      receiverName: 'Budi Santoso',
      counterpartPhone: '0812',
    };
    expect(toPartyFields('delivery_to_customer', names)).toEqual({
      partnerStaffName: 'Andi Pratama',
      counterpartName: 'Budi Santoso',
      counterpartPhone: '0812',
    });
    // Same form values, opposite direction → the parties swap
    expect(toPartyFields('return_from_customer', names)).toEqual({
      partnerStaffName: 'Budi Santoso',
      counterpartName: 'Andi Pratama',
      counterpartPhone: '0812',
    });
    expect(
      toPartyFields('delivery_to_customer', {
        giverName: ' ',
        receiverName: '',
        counterpartPhone: '',
      }),
    ).toEqual({
      partnerStaffName: undefined,
      counterpartName: undefined,
      counterpartPhone: undefined,
    });
  });

  it('creates a draft carrying both names on the right sides', async () => {
    const { result } = renderHook(() => useCreateCheckpoint(), {
      wrapper: wrapperFor(makeClient()),
    });
    let created!: CheckpointDetail;
    await act(async () => {
      created = await result.current.mutateAsync({
        plateNumber: 'B 1001 XYZ',
        handoverType: 'return_from_driver',
        ...toPartyFields('return_from_driver', {
          giverName: 'Slamet Riyadi',
          receiverName: 'Andi Pratama',
          counterpartPhone: '08123',
        }),
      });
    });
    expect(created.partnerStaffName).toBe('Andi Pratama');
    expect(created.counterpartName).toBe('Slamet Riyadi');
  });
});

function PartyFieldsHarness({ handoverType }: { handoverType: HandoverType | '' }) {
  const [value, setValue] = useState<HandoverPartyNames>({
    giverName: '',
    receiverName: '',
    counterpartPhone: '',
  });
  return <HandoverPartyFields handoverType={handoverType} value={value} onChange={setValue} />;
}

describe('HandoverPartyFields', () => {
  it('keeps both sides free-text for a customer handover', () => {
    render(<PartyFieldsHarness handoverType="delivery_to_customer" />, {
      wrapper: wrapperFor(makeClient()),
    });
    expect(screen.getByLabelText(/Nama Penyerah/)).toHaveRole('textbox');
    expect(screen.getByLabelText(/Nama Penerima/)).toHaveRole('textbox');
    expect(screen.getByLabelText(/Telepon/)).toBeInTheDocument();
  });

  it('turns the driver side into a searchable roster picker', async () => {
    const user = userEvent.setup();
    render(<PartyFieldsHarness handoverType="delivery_to_driver" />, {
      wrapper: wrapperFor(makeClient()),
    });

    // Penyerah is the partner's own officer — still typed by hand
    expect(screen.getByLabelText(/Nama Penyerah/)).toHaveRole('textbox');
    const picker = screen.getByLabelText(/Nama Penerima/);
    expect(picker).toHaveRole('combobox');

    await user.click(picker);
    const search = await screen.findByLabelText('Cari nama driver');
    await user.type(search, 'agus');
    const option = await screen.findByRole('option', { name: /Agus Salim/i });
    await user.click(option);
    await waitFor(() => expect(picker).toHaveTextContent(/Agus Salim/i));
  });

  it('moves the roster picker to the penyerah on a return', () => {
    render(<PartyFieldsHarness handoverType="return_from_driver" />, {
      wrapper: wrapperFor(makeClient()),
    });
    expect(screen.getByLabelText(/Nama Penyerah/)).toHaveRole('combobox');
    expect(screen.getByLabelText(/Nama Penerima/)).toHaveRole('textbox');
  });
});

describe('CompletionCard', () => {
  const renderCard = (detail: CheckpointDetail) =>
    render(<CompletionCard detail={detail} />, { wrapper: wrapperFor(makeClient()) });

  const loadDetail = async (id: number) => {
    const client = makeClient();
    const { result } = renderHook(() => useCheckpointQuery(id), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    return result.current.data!;
  };

  it('locks the signature pads until every point is assessed and photographed', async () => {
    const detail = await loadDetail(2); // seed draft: nothing assessed yet
    expect(checkpointProgress(detail).ready).toBe(false);
    renderCard(detail);

    expect(screen.getByText(/Tanda tangan aktif setelah semua titik/)).toBeInTheDocument();
    for (const pad of screen.getAllByRole('img', { name: /Area tanda tangan/ })) {
      expect(pad).toHaveAttribute('aria-disabled', 'true');
    }
    expect(screen.getByRole('button', { name: /Selesaikan & Kunci/ })).toBeDisabled();
  });

  it('unlocks them once the inspection is complete, labelled by role and signer', async () => {
    const source = await loadDetail(1); // seed completed: all points done + photographed
    const detail: CheckpointDetail = { ...source, status: 'draft' };
    expect(checkpointProgress(detail).ready).toBe(true);
    renderCard(detail);

    expect(screen.queryByText(/Tanda tangan aktif setelah semua titik/)).not.toBeInTheDocument();
    // Delivery: the partner's officer hands over, the customer receives
    expect(screen.getByText('Tanda Tangan Penyerah')).toBeInTheDocument();
    expect(screen.getByText('Andi Pratama · Petugas Partner')).toBeInTheDocument();
    expect(screen.getByText('Tanda Tangan Penerima')).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso · Customer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Selesaikan & Kunci/ })).toBeEnabled();
  });
});
