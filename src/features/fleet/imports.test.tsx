import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { qk } from '@/lib/query-client';
import { useImportProgress } from '@/lib/socket/useImportProgress';
import { useUploadImport, useRollbackImport, useImportsQuery } from './hooks/useImports';
import { api, unwrap } from '@/lib/api-client/client';

// fake socket.io-client surface — handlers captured per event
const socketHandlers = new Map<string, (payload: unknown) => void>();
const fakeSocket = {
  emit: vi.fn(),
  on: vi.fn((event: string, cb: (payload: unknown) => void) => {
    socketHandlers.set(event, cb);
  }),
  off: vi.fn(),
};
vi.mock('@/lib/socket', () => ({
  realtimeEnabled: () => true,
  getSocket: () => fakeSocket,
}));

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

describe('useImportProgress (socket patches the Query cache, kickoff §8)', () => {
  it('joins the import room and applies import:progress to the status cache', () => {
    const client = makeClient();
    renderHook(() => useImportProgress('gojek', 5), { wrapper: wrapperFor(client) });

    expect(fakeSocket.emit).toHaveBeenCalledWith('join', { importId: 5 });

    act(() => {
      socketHandlers.get('import:progress')!({ importId: 5, processed: 400, total: 800, percent: 50 });
    });
    expect(client.getQueryData(qk.fleet.importStatus('gojek', '5'))).toMatchObject({
      status: 'processing',
      processed: 400,
      percent: 50,
    });

    // events for OTHER imports are ignored
    act(() => {
      socketHandlers.get('import:progress')!({ importId: 99, processed: 1, total: 2, percent: 50 });
    });
    expect(client.getQueryData(qk.fleet.importStatus('gojek', '99'))).toBeUndefined();
  });

  it('import:done invalidates the imports list and the grid', () => {
    const client = makeClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useImportProgress('gojek', 7), { wrapper: wrapperFor(client) });

    act(() => {
      socketHandlers.get('import:done')!({ importId: 7, rowsInserted: 8000, durationMs: 1200 });
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.fleet.imports('gojek') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['fleet', 'gojek', 'grid'] });
  });

  it('import:failed marks the cached status failed with the error', () => {
    const client = makeClient();
    renderHook(() => useImportProgress('grab', 9), { wrapper: wrapperFor(client) });

    act(() => {
      socketHandlers.get('import:failed')!({ importId: 9, error: 'kolom tidak dikenal' });
    });
    expect(client.getQueryData(qk.fleet.importStatus('grab', '9'))).toMatchObject({
      status: 'failed',
      error: 'kolom tidak dikenal',
    });
  });
});

describe('import lifecycle against the stateful mock (upload → poll → done → rollback)', () => {
  const pollStatus = async (id: number) => {
    const { data } = await api.GET('/admin/fleet/{platform}/imports/{id}', {
      params: { path: { platform: 'gojek', id } },
    });
    return unwrap(data);
  };

  it('runs the whole flow', async () => {
    const client = makeClient();
    const wrapper = wrapperFor(client);

    // upload
    const upload = renderHook(() => useUploadImport('gojek'), { wrapper });
    const file = new File(['a,b,c'], 'gojek-2026-07.csv', { type: 'text/csv' });
    upload.result.current.mutate({ file, month: 7, year: 2026 });
    await waitFor(() => expect(upload.result.current.isSuccess).toBe(true));
    const importId = upload.result.current.data!.importId;

    // async parse: each poll advances 25% until done
    let status = await pollStatus(importId);
    expect(status.status).toBe('processing');
    for (let i = 0; i < 3; i++) status = await pollStatus(importId);
    expect(status.status).toBe('done');
    expect(status.processed).toBe(status.totalRows);

    // the new batch shows in the list
    const list = renderHook(() => useImportsQuery('gojek'), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(list.result.current.data!.some((b) => b.id === importId)).toBe(true);

    // rollback removes the whole batch
    const rollback = renderHook(() => useRollbackImport('gojek'), { wrapper });
    rollback.result.current.mutate(importId);
    await waitFor(() => expect(rollback.result.current.isSuccess).toBe(true));

    const { data } = await api.GET('/admin/fleet/{platform}/imports', {
      params: { path: { platform: 'gojek' } },
    });
    expect(unwrap(data).some((b) => b.id === importId)).toBe(false);
  });
});
