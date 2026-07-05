import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useCreateException,
  useDeleteException,
  useExceptionsQuery,
} from './hooks/useExceptions';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

describe('exceptions CRUD (Gojek, §6.1)', () => {
  it('creates, lists (scoped to period), and deletes', async () => {
    const client = makeClient();
    const wrapper = wrapperFor(client);

    const create = renderHook(() => useCreateException(), { wrapper });
    create.result.current.mutate({
      vehiclePlate: 'B9999TEST',
      exceptionDate: '2026-08-05',
      keterangan: 'maintenance',
      isBebasSetoran: true,
    });
    await waitFor(() => expect(create.result.current.isSuccess).toBe(true));
    const created = create.result.current.data!;
    expect(created.isBebasSetoran).toBe(true);

    // listed under its own period…
    const listAug = renderHook(() => useExceptionsQuery({ month: 8, year: 2026 }), { wrapper });
    await waitFor(() => expect(listAug.result.current.isSuccess).toBe(true));
    expect(listAug.result.current.data!.some((e) => e.id === created.id)).toBe(true);

    // …not under another period
    const listJun = renderHook(() => useExceptionsQuery({ month: 6, year: 2026 }), { wrapper });
    await waitFor(() => expect(listJun.result.current.isSuccess).toBe(true));
    expect(listJun.result.current.data!.some((e) => e.id === created.id)).toBe(false);

    const del = renderHook(() => useDeleteException(), { wrapper });
    del.result.current.mutate(created.id);
    await waitFor(() => expect(del.result.current.isSuccess).toBe(true));

    await listAug.result.current.refetch();
    await waitFor(() =>
      expect(listAug.result.current.data!.some((e) => e.id === created.id)).toBe(false),
    );
  });
});
