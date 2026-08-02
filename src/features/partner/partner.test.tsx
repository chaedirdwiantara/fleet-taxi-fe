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

  it('sends the table filters to the server and stays inside the own-plate scope', async () => {
    const unfiltered = renderHook(() => usePartnerGojekGridQuery({ month: 6, year: 2026 }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(unfiltered.result.current.isSuccess).toBe(true));
    const all = unfiltered.result.current.data!;
    expect(all.availableVehicleTypes!.length).toBeGreaterThan(0);

    // free text narrows by plate…
    const byPlate = renderHook(
      () => usePartnerGojekGridQuery({ month: 6, year: 2026, q: 'B1000' }),
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(byPlate.result.current.isSuccess).toBe(true));
    expect(byPlate.result.current.data!.rows.map((r) => r.plateNorm)).toEqual(['B1000XYZ']);

    // …and by driver, from the same box
    const driverName = all.rows[0].driverName;
    const byDriver = renderHook(
      () => usePartnerGojekGridQuery({ month: 6, year: 2026, q: driverName }),
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(byDriver.result.current.isSuccess).toBe(true));
    expect(byDriver.result.current.data!.rows.length).toBeGreaterThan(0);
    expect(byDriver.result.current.data!.rows.every((r) => r.driverName === driverName)).toBe(true);

    // a plate this partner never registered can never be reached through a filter
    const foreign = renderHook(
      () => usePartnerGojekGridQuery({ month: 6, year: 2026, q: 'B1099XYZ' }),
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(foreign.result.current.isSuccess).toBe(true));
    expect(foreign.result.current.data!.rows).toEqual([]);

    // the type filter matches the Type the grid displays
    const type = all.availableVehicleTypes![0];
    const byType = renderHook(
      () => usePartnerGojekGridQuery({ month: 6, year: 2026, vehicleType: [type] }),
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(byType.result.current.isSuccess).toBe(true));
    expect(byType.result.current.data!.rows.every((r) => r.vehicleType === type)).toBe(true);
    // the options list never shrinks with the selection
    expect(byType.result.current.data!.availableVehicleTypes).toEqual(all.availableVehicleTypes);
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
