import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useDashboardQuery, useOrdersQuery, useOrderQuery } from './hooks';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

describe('partner portal hooks (§6.2 — server-scoped, envelope-unwrapped)', () => {
  it('dashboard exposes metrics + chart series', async () => {
    const { result } = renderHook(() => useDashboardQuery(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const d = result.current.data!;
    expect(d.totalOrders).toBeGreaterThan(0);
    expect(Number.isInteger(d.revenueThisMonth)).toBe(true); // integer rupiah
    expect(d.ordersByDay.length).toBeGreaterThan(0);
    expect(d.ordersByStatus.length).toBeGreaterThan(0);
  });

  it('orders list carries pagination meta from the envelope', async () => {
    const { result } = renderHook(() => useOrdersQuery({ page: 3, pageSize: 10 }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.data).toHaveLength(10);
    expect(result.current.data!.meta).toEqual({ page: 3, pageSize: 10, total: 120 });
    // page 3 starts at order 21
    expect(result.current.data!.data[0].id).toBe(21);
  });

  it('order detail resolves one own order; money stays integer', async () => {
    const { result } = renderHook(() => useOrderQuery('7'), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.orderNumber).toBe('ORD-2026-00007');
    expect(Number.isInteger(result.current.data!.basicPrice)).toBe(true);
  });
});
