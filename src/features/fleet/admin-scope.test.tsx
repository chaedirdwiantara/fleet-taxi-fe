import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useGojekGridQuery, useGojekSummaryQuery } from './hooks/useFleetQueries';
import { resetPartnerPlates } from '@/mocks/handlers';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

beforeEach(() => resetPartnerPlates());

// The admin table mirrors the union of every partner's Daftarkan Plat
// registrations, and the dashboard summary derives from those same rows.
describe('admin fleet monitoring — synced to partner-registered plates', () => {
  it('the grid shows only plates registered by a partner (no unregistered/manual rows)', async () => {
    const { result } = renderHook(
      () => useGojekGridQuery({ month: 6, year: 2026, rentalPartner: [] }),
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const norms = result.current.data!.rows.map((r) => r.plateNorm);
    expect(norms.length).toBeGreaterThan(0);
    // only the seeded Gojek registrations (the Grab-only plate has no Gojek row)
    expect(norms.every((n) => ['B1000XYZ', 'B1001XYZ'].includes(n))).toBe(true);
    expect(norms.some((n) => n.startsWith('manual_'))).toBe(false);
  });

  it('the summary counts exactly the rows the table shows', async () => {
    const client = makeClient();
    const { result: grid } = renderHook(
      () => useGojekGridQuery({ month: 6, year: 2026, rentalPartner: [] }),
      { wrapper: wrapperFor(client) },
    );
    const { result: summary } = renderHook(() => useGojekSummaryQuery({ month: 6, year: 2026 }), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(grid.current.isSuccess).toBe(true));
    await waitFor(() => expect(summary.current.isSuccess).toBe(true));

    const rows = grid.current.data!.rows;
    const exited = rows.filter((r) => r.isExited);
    expect(summary.current.data!.globalSummary).toEqual({
      totalDeduction: rows.reduce((s, r) => s + r.summary.totalDeduction, 0),
      totalDue: rows.reduce((s, r) => s + r.summary.calculatedTarget, 0),
      // exited rows report on the Outstanding Driver Keluar card, not the main total
      totalOutstanding: rows.reduce((s, r) => s + (r.isExited ? 0 : r.summary.outstanding), 0),
      totalOutstandingMonth: rows.reduce(
        (s, r) => s + (r.isExited ? 0 : (r.summary.outstandingMonth ?? 0)),
        0,
      ),
      outstandingDriverKeluar: exited.reduce((s, r) => s + r.summary.outstanding, 0),
      exitedCount: exited.filter((r) => r.summary.outstanding !== 0).length,
    });
  });
});
