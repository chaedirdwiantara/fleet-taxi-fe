import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useCheckpointQuery,
  useCheckpointsQuery,
  useComparisonQuery,
  useCompleteCheckpoint,
  useCreateCheckpoint,
  useDeleteCheckpoint,
  useUpdatePoint,
} from './hooks';
import { resetCheckpoints, resetPartnerPlates } from '@/mocks/handlers';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

beforeEach(() => {
  resetPartnerPlates();
  resetCheckpoints();
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
      const err = result.current.error as { details?: { field: string }[] } | null;
      // 10 unassessed + 10 photoless + 2 signatures
      expect(err?.details).toHaveLength(22);
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
