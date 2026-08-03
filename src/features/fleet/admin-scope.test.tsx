import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useGojekGridQuery,
  useGojekSummaryQuery,
  usePartnerGojekGridQuery,
} from './hooks/useFleetQueries';
import { resetAdminPlates, resetPartnerPlates } from '@/mocks/handlers';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

beforeEach(() => {
  resetPartnerPlates();
  resetAdminPlates();
});

// The admin table is scoped to the union of every partner's Daftarkan Plat
// registration AND the console's own Plate Registration; the dashboard summary
// derives from those same rows.
describe('admin fleet monitoring — synced to the registered plates', () => {
  it('the grid shows registered plates only — partners’ and the admin’s own', async () => {
    const { result } = renderHook(
      () => useGojekGridQuery({ month: 6, year: 2026, rentalPartner: [] }),
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const norms = result.current.data!.rows.map((r) => r.plateNorm);
    // the seeded Gojek registrations (the Grab-only plate has no Gojek row)
    // plus B1003XYZ, which only the admin registry carries
    expect(norms.every((n) => ['B1000XYZ', 'B1001XYZ', 'B1003XYZ'].includes(n))).toBe(true);
    expect(norms).toContain('B1000XYZ');
    expect(norms).toContain('B1003XYZ');
    expect(norms.some((n) => n.startsWith('manual_'))).toBe(false);
  });

  it('a plate only the admin registered stays out of the partner grid', async () => {
    const { result } = renderHook(() => usePartnerGojekGridQuery({ month: 6, year: 2026 }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const norms = result.current.data!.rows.map((r) => r.plateNorm);
    expect(norms).toContain('B1000XYZ'); // its own registration
    expect(norms).not.toContain('B1003XYZ'); // the admin registry's
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
