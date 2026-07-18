import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePartnerPlatesQuery, useRegisterPlate, useDeletePlate } from './hooks';
import {
  usePartnerGojekGridQuery,
  usePartnerGojekSummaryQuery,
} from '@/features/fleet/hooks/useFleetQueries';
import { resetPartnerPlates } from '@/mocks/handlers';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

beforeEach(() => resetPartnerPlates());

describe('Daftarkan Plat — CRUD over own registered plates', () => {
  it('lists the registered plates (nomor + Type)', async () => {
    const { result } = renderHook(() => usePartnerPlatesQuery(), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!).toHaveLength(3);
    expect(result.current.data!.map((p) => p.plateNumberNorm)).toContain('B1000XYZ');
    expect(result.current.data![0]).toHaveProperty('vehicleType');
  });

  it('registers a plate (normalizing) and rejects duplicates + blanks', async () => {
    const { result } = renderHook(() => useRegisterPlate(), { wrapper: wrapperFor(makeClient()) });

    let created!: { plateNumberNorm: string };
    await act(async () => {
      created = await result.current.mutateAsync({
        plateNumber: 'b 1002 xyz',
        vehicleType: 'Innova',
      });
    });
    expect(created.plateNumberNorm).toBe('B1002XYZ');

    await act(async () => {
      await expect(result.current.mutateAsync({ plateNumber: 'B1002XYZ' })).rejects.toMatchObject({
        code: 'CONFLICT',
      });
      await expect(result.current.mutateAsync({ plateNumber: '   ' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
    });
  });

  it('deletes a plate', async () => {
    const { result } = renderHook(() => useDeletePlate(), { wrapper: wrapperFor(makeClient()) });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    const { result: list } = renderHook(() => usePartnerPlatesQuery(), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(list.current.isSuccess).toBe(true));
    expect(list.current.data!.map((p) => p.id)).not.toContain(1);
  });
});

describe('partner fleet monitoring — scoped to registered plates', () => {
  it('the Gojek grid shows only registered plates', async () => {
    const { result } = renderHook(() => usePartnerGojekGridQuery({ month: 6, year: 2026 }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const norms = result.current.data!.rows.map((r) => r.plateNorm);
    expect(norms.length).toBeGreaterThan(0);
    // only the seeded Gojek plates (the Grab-only plate must not appear here)
    expect(norms.every((n) => ['B1000XYZ', 'B1001XYZ'].includes(n))).toBe(true);
  });

  it('with no registered plates the grid is empty and the summary is Rp 0', async () => {
    const delClient = makeClient();
    const { result: del } = renderHook(() => useDeletePlate(), { wrapper: wrapperFor(delClient) });
    for (const id of [1, 2, 3]) {
      await act(async () => {
        await del.current.mutateAsync(id);
      });
    }

    const { result: grid } = renderHook(() => usePartnerGojekGridQuery({ month: 6, year: 2026 }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(grid.current.isSuccess).toBe(true));
    expect(grid.current.data!.rows).toHaveLength(0);
    expect(grid.current.data!.tableTotals.totalDeduction).toBe(0);

    const { result: summary } = renderHook(
      () => usePartnerGojekSummaryQuery({ month: 6, year: 2026 }),
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(summary.current.isSuccess).toBe(true));
    expect(summary.current.data!.globalSummary).toEqual({
      totalDeduction: 0,
      totalDue: 0,
      totalOutstanding: 0,
      totalOutstandingMonth: 0,
      outstandingDriverKeluar: 0,
      exitedCount: 0,
    });
  });
});
