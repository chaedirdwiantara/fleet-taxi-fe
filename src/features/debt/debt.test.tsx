import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { useDebtFiltersQuery, useDebtSummaryQuery } from './hooks';
import { DebtSummaryPage } from './DebtSummaryPage';
import { debtSearchSchema } from './searchSchema';
import { DebtTable, waLink } from './components/DebtTable';
import { debtRows } from '@/mocks/fixtures/debt';
import type { DebtListParams } from './types';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

const params = (over: Partial<DebtListParams> = {}): DebtListParams => ({
  sortBy: 'selisihDeposit',
  sortOrder: 'asc',
  page: 1,
  pageSize: 10,
  ...over,
});

describe('Debt Summary — list query', () => {
  it('returns paginated rows with meta (default: least covered first)', async () => {
    const { result } = renderHook(() => useDebtSummaryQuery(params()), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const { data, meta } = result.current.data!;
    expect(meta).toMatchObject({ page: 1, pageSize: 10, total: debtRows.length });
    expect(data).toHaveLength(10);
    // worst-covered driver first
    expect(data[0]!.selisihDeposit).toBeLessThanOrEqual(data[1]!.selisihDeposit);
    // money is integer rupiah — never a float
    for (const row of data) {
      expect(Number.isInteger(row.totalTagihan)).toBe(true);
      expect(row.cicilanLainnya).toBeNull(); // placeholder until the logic lands
    }
  });

  it('filters by status, koordinator and free-text search', async () => {
    const { result: byStatus } = renderHook(
      () => useDebtSummaryQuery(params({ status: 'nonaktif' })),
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(byStatus.current.isSuccess).toBe(true));
    expect(byStatus.current.data!.data.every((r) => r.status === 'nonaktif')).toBe(true);

    const { result: bySearch } = renderHook(
      () => useDebtSummaryQuery(params({ search: 'b 1553' })),
      { wrapper: wrapperFor(makeClient()) },
    );
    await waitFor(() => expect(bySearch.current.isSuccess).toBe(true));
    expect(bySearch.current.data!.data.map((r) => r.driverName)).toEqual(['IQBAL FAUZI']);
  });

  it('paginates past the first page', async () => {
    const { result } = renderHook(() => useDebtSummaryQuery(params({ page: 2, pageSize: 10 })), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.data).toHaveLength(debtRows.length - 10);
    expect(result.current.data!.meta!.page).toBe(2);
  });
});

describe('Debt Summary — filter options', () => {
  it('exposes cabang + koordinator dropdown options', async () => {
    const { result } = renderHook(() => useDebtFiltersQuery(), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.cabang).toContain('Jakarta');
    expect(result.current.data!.koordinator).toContain('Rekli Fonda');
  });
});

describe('waLink', () => {
  it('normalizes 08… to a 62 wa.me link and rejects empty numbers', () => {
    expect(waLink('0812-3456-0001')).toBe('https://wa.me/6281234560001');
    expect(waLink('6281234560001')).toBe('https://wa.me/6281234560001');
    expect(waLink(null)).toBeNull();
    expect(waLink('')).toBeNull();
  });
});

describe('DebtTable', () => {
  it('flags uncovered drivers and renders the placeholder column', () => {
    render(<DebtTable rows={debtRows} sortBy="selisihDeposit" sortOrder="asc" onSort={() => {}} />);
    expect(screen.getByText('Cicilan Lainnya')).toBeInTheDocument();
    expect(screen.getAllByText('Tidak Tercover Deposit').length).toBeGreaterThan(0);
    // covered driver (HENDRA: deposit 2jt > tagihan 400rb) has no red badge row
    expect(screen.getByText('HENDRA GUNAWAN')).toBeInTheDocument();
    // WhatsApp action is present for a driver with a phone number
    const wa = screen.getAllByRole('link', { name: /whatsapp/i });
    expect(wa[0]).toHaveAttribute('href', expect.stringContaining('https://wa.me/'));
  });
});

describe('DebtSummaryPage — development notice', () => {
  it('shows the in-development dialog on open and dismisses via Mengerti', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={makeClient()}>
        <DebtSummaryPage search={debtSearchSchema.parse({})} onPatch={() => {}} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Fitur Dalam Pengembangan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mengerti' }));
    await waitFor(() =>
      expect(screen.queryByText('Fitur Dalam Pengembangan')).not.toBeInTheDocument(),
    );
  });
});
