import { useState } from 'react';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateRangeID, formatDateTimeWIB } from '@/lib/datetime';
import { RUNS_PAGE_SIZE, useGojekPortalRunsQuery } from '../hooks';
import { TRIGGER_LABELS, type GojekPortalSyncRun } from '../types';
import { RunStatusBadge } from './RunStatusBadge';

const COLUMNS = 7;

export function RunHistoryTable() {
  const [page, setPage] = useState(1);
  const runs = useGojekPortalRunsQuery(page);
  const total = runs.data?.meta?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / RUNS_PAGE_SIZE));
  const rows = runs.data?.data ?? [];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Riwayat Sinkronisasi</h3>
        <p className="text-sm text-muted-foreground">
          Setiap tarikan, terjadwal maupun manual. Batch yang dihasilkan tampil di Riwayat Import
          Gojek dengan penanda <em>Portal</em>.
        </p>
      </div>

      {runs.isError && (
        <p className="text-sm text-destructive">Gagal memuat riwayat: {runs.error.message}</p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Mulai (WIB)</TableHead>
              <TableHead>Pemicu</TableHead>
              <TableHead className="whitespace-nowrap">Rentang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right whitespace-nowrap">Baris</TableHead>
              <TableHead>Berkas</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={runs.isFetching ? 'opacity-60 transition-opacity' : undefined}>
            {runs.isPending &&
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMNS }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {runs.isSuccess && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS} className="p-0">
                  <EmptyState
                    icon={History}
                    title="Belum ada sinkronisasi"
                    description="Aktifkan jadwal atau jalankan sekarang; setiap tarikan tercatat di sini."
                  />
                </TableCell>
              </TableRow>
            )}
            {rows.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </TableBody>
        </Table>
      </div>

      {total > RUNS_PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground tabular-nums">
            {total.toLocaleString('id-ID')} sinkronisasi · Halaman {page} dari {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RunRow({ run }: { run: GojekPortalSyncRun }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap tabular-nums">
        <span className="block">{formatDateTimeWIB(run.startedAt)}</span>
        {run.triggeredByName && (
          <span
            className="block truncate text-xs text-muted-foreground"
            title={run.triggeredByName}
          >
            {run.triggeredByName}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={run.trigger === 'schedule' ? 'secondary' : 'outline'}>
          {TRIGGER_LABELS[run.trigger]}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {formatDateRangeID(run.dateFrom, run.dateTo)}
      </TableCell>
      <TableCell>
        <RunStatusBadge status={run.status} />
      </TableCell>
      <TableCell className="text-right whitespace-nowrap tabular-nums">
        {run.importedRows == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <>
            {run.importedRows.toLocaleString('id-ID')}
            {(run.skippedRows ?? 0) > 0 && (
              <span className="block text-xs text-muted-foreground">
                {run.skippedRows!.toLocaleString('id-ID')} dilewati
              </span>
            )}
          </>
        )}
      </TableCell>
      <TableCell className="max-w-48">
        {run.filename ? (
          <span className="block truncate font-mono text-xs" title={run.filename}>
            {run.filename}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="max-w-80">
        <span
          className={
            run.status === 'failed'
              ? 'line-clamp-2 text-destructive'
              : 'line-clamp-2 text-muted-foreground'
          }
          title={run.message ?? undefined}
        >
          {run.message ?? (run.status === 'running' ? 'Sedang berjalan…' : '—')}
        </span>
      </TableCell>
    </TableRow>
  );
}
