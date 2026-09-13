import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Play, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addDaysISO, daysInRangeISO, formatDateRangeID, todayWIB } from '@/lib/datetime';
import { useGojekPortalRunQuery, useInvalidateAfterRun, useRunGojekPortalSync } from '../hooks';
import { MAX_RANGE_DAYS, type GojekPortalSyncStatus } from '../types';

/**
 * "Jalankan sekarang": optional WIB range (blank = the schedule's own range),
 * queued on the server and followed here by polling the run until it leaves
 * `running`. Finishing refreshes the history, the status tiles, and the Gojek
 * import list + grid, because a success just added batches to them.
 */
export function RunNowCard({
  status,
  lookbackDays,
  canRun,
}: {
  status: GojekPortalSyncStatus | undefined;
  lookbackDays: number;
  canRun: boolean;
}) {
  const run = useRunGojekPortalSync();
  const invalidateAfterRun = useInvalidateAfterRun();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const active = useGojekPortalRunQuery(activeRunId);

  const finished = active.data && active.data.status !== 'running' ? active.data : null;
  useEffect(() => {
    if (finished) invalidateAfterRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished?.id, finished?.status]);

  const today = todayWIB();
  const rangeError = validateRange(dateFrom, dateTo, today);
  const otherRunning = !!status?.runningRun && status.runningRun.id !== activeRunId;
  const inFlight = run.isPending || active.data?.status === 'running';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rangeError) return;
    run.mutate(
      { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      { onSuccess: (r) => setActiveRunId(r.id) },
    );
  };

  const yesterday = addDaysISO(today, -1);
  const defaultRangeLabel = formatDateRangeID(
    addDaysISO(yesterday, -(lookbackDays - 1)),
    yesterday,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Jalankan Sekarang</CardTitle>
        <CardDescription>
          Tarik laporan di luar jadwal. Kosongkan tanggal untuk memakai rentang jadwal (
          {defaultRangeLabel}).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="gps-from">Dari tanggal (WIB)</Label>
              <Input
                id="gps-from"
                type="date"
                max={today}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gps-to">Sampai tanggal (WIB)</Label>
              <Input
                id="gps-to"
                type="date"
                max={today}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          {rangeError && (
            <p className="text-sm text-destructive" role="alert">
              {rangeError}
            </p>
          )}
          {!canRun && (
            <p className="text-sm text-muted-foreground">
              Simpan email &amp; kata sandi portal terlebih dahulu.
            </p>
          )}
          {otherRunning && (
            <p className="text-sm text-muted-foreground">
              Sinkronisasi lain sedang berjalan — tunggu sampai selesai.
            </p>
          )}
          {run.isError && (
            <p className="text-sm text-destructive" role="alert">
              {run.error.message}
            </p>
          )}
          <Button
            type="submit"
            className="w-full sm:w-auto sm:justify-self-end"
            disabled={!canRun || inFlight || otherRunning || !!rangeError}
          >
            {inFlight ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
            Jalankan Sekarang
          </Button>
        </form>

        {active.data?.status === 'running' && (
          <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm">
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">
                Sinkronisasi #{active.data.id} ·{' '}
                {formatDateRangeID(active.data.dateFrom, active.data.dateTo)}
              </p>
              <p className="text-muted-foreground">{phaseLabel(active.data)}</p>
            </div>
          </div>
        )}
        {finished?.status === 'success' && (
          <p
            className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Selesai — {finished.message}</span>
          </p>
        )}
        {finished?.status === 'failed' && (
          <p
            className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Gagal — {finished.message}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Which step the server is on, inferred from what the run has recorded so far. */
function phaseLabel(run: {
  reportId: number | null;
  filename: string | null;
  importIds: number[];
}): string {
  if (run.importIds.length > 0) return 'Mengimpor berkas ke Gojek Monitoring…';
  if (run.filename) return 'Berkas terunduh, menyiapkan import…';
  if (run.reportId) return `Menunggu portal menyusun laporan #${run.reportId}…`;
  return 'Masuk ke portal & meminta laporan…';
}

/** Client-side mirror of the backend range rules (the server re-validates). */
function validateRange(from: string, to: string, today: string): string | null {
  if (!from && !to) return null;
  if (!from || !to) return 'Isi kedua tanggal, atau kosongkan keduanya.';
  if (from > to) return 'Tanggal awal tidak boleh melewati tanggal akhir.';
  if (to > today) return 'Tanggal akhir tidak boleh melewati hari ini.';
  if (daysInRangeISO(from, to) > MAX_RANGE_DAYS) return `Rentang maksimal ${MAX_RANGE_DAYS} hari.`;
  return null;
}
