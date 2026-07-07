import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { qk, type Platform } from '@/lib/query-client';
import { getSocket, realtimeEnabled } from './index';

export type ImportProgressEvent = {
  importId: number;
  processed: number;
  total: number;
  percent: number;
};
export type ImportDoneEvent = { importId: number; rowsInserted: number; durationMs: number };
export type ImportFailedEvent = { importId: number; error: string };

// The socket PATCHES the Query cache; components just read Query state
// (kickoff §8). Event catalog is frozen in PROJECT-BRIEF.md §4.
export function useImportProgress(platform: Platform, importId: number | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (importId === null || !realtimeEnabled()) return;

    const socket = getSocket();
    socket.emit('join', { importId });

    const statusKey = qk.fleet.importStatus(platform, String(importId));

    const onProgress = (p: ImportProgressEvent) => {
      if (p.importId !== importId) return;
      qc.setQueryData(statusKey, (old: object | undefined) => ({
        ...(old ?? {}),
        status: 'processing',
        processed: p.processed,
        totalRows: p.total,
        percent: p.percent,
      }));
    };
    const onDone = (p: ImportDoneEvent) => {
      if (p.importId !== importId) return;
      // Resolve the status query so the popup shows the success state (the
      // legacy "Imported Successfully!"). Without this the popup would hang on
      // "processing" even though the rows already landed.
      qc.setQueryData(statusKey, (old: object | undefined) => ({
        ...(old ?? {}),
        status: 'done',
        processed: p.rowsInserted,
        totalRows: p.rowsInserted,
        percent: 100,
      }));
      qc.invalidateQueries({ queryKey: qk.fleet.imports(platform) });
      qc.invalidateQueries({ queryKey: ['fleet', platform, 'grid'] }); // refresh pivot
    };
    const onFailed = (p: ImportFailedEvent) => {
      if (p.importId !== importId) return;
      qc.setQueryData(statusKey, (old: object | undefined) => ({
        ...(old ?? {}),
        status: 'failed',
        error: p.error,
      }));
    };

    socket.on('import:progress', onProgress);
    socket.on('import:done', onDone);
    socket.on('import:failed', onFailed);
    return () => {
      socket.off('import:progress', onProgress);
      socket.off('import:done', onDone);
      socket.off('import:failed', onFailed);
    };
  }, [platform, importId, qc]);
}
