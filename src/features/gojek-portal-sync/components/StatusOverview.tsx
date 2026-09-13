import type { ComponentType } from 'react';
import { CalendarClock, CheckCircle2, KeyRound, Loader2, type LucideProps } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateRangeID, formatDateTimeWIB } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { GojekPortalSyncRun, GojekPortalSyncSettings, GojekPortalSyncStatus } from '../types';
import { RunStatusBadge } from './RunStatusBadge';

type Tile = {
  icon: ComponentType<LucideProps>;
  label: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
};

/**
 * Four at-a-glance tiles: schedule, last success, last/current process, and
 * the portal account. The tiles read the same status payload the run poller
 * refreshes, so a run in flight shows up here without a reload.
 */
export function StatusOverview({
  status,
  settings,
  isPending,
}: {
  status: GojekPortalSyncStatus | undefined;
  settings: GojekPortalSyncSettings | undefined;
  isPending: boolean;
}) {
  if (isPending || !status || !settings) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const tiles: Tile[] = [
    {
      icon: CalendarClock,
      label: 'Jadwal harian',
      primary: (
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant={status.isEnabled ? 'default' : 'secondary'}>
            {status.isEnabled ? 'Aktif' : 'Nonaktif'}
          </Badge>
          <span className="text-sm">
            {settings.runAt} WIB · mundur {settings.lookbackDays} hari
          </span>
        </span>
      ),
      secondary: status.isEnabled
        ? status.nextScheduledAt
          ? `Berikutnya ${formatDateTimeWIB(status.nextScheduledAt)}${
              status.todayScheduledAttempts > 0
                ? ` · ${status.todayScheduledAttempts} percobaan hari ini`
                : ''
            }`
          : null
        : 'Aktifkan di pengaturan agar laporan ditarik otomatis.',
    },
    {
      icon: CheckCircle2,
      label: 'Terakhir berhasil',
      primary: status.lastSuccess ? (
        <span className="text-sm font-medium tabular-nums">
          {formatDateTimeWIB(status.lastSuccess.finishedAt ?? status.lastSuccess.startedAt)}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">Belum pernah</span>
      ),
      secondary: status.lastSuccess ? runSummary(status.lastSuccess) : undefined,
    },
    {
      icon: status.runningRun ? Loader2 : CalendarClock,
      label: 'Proses terakhir',
      primary: status.runningRun ? (
        <span className="flex items-center gap-2 text-sm">
          <RunStatusBadge status="running" />
          <span className="tabular-nums">
            sejak {formatDateTimeWIB(status.runningRun.startedAt)}
          </span>
        </span>
      ) : status.lastRun ? (
        <span className="flex items-center gap-2 text-sm">
          <RunStatusBadge status={status.lastRun.status} />
          <span className="tabular-nums">
            {formatDateTimeWIB(status.lastRun.finishedAt ?? status.lastRun.startedAt)}
          </span>
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">Belum ada proses</span>
      ),
      secondary: status.runningRun
        ? `Rentang ${formatDateRangeID(status.runningRun.dateFrom, status.runningRun.dateTo)}`
        : status.lastRun?.message,
    },
    {
      icon: KeyRound,
      label: 'Akun portal',
      primary: settings.email ? (
        <span className="block truncate text-sm font-medium" title={settings.email}>
          {settings.email}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">Belum diatur</span>
      ),
      secondary: !settings.hasPassword
        ? 'Kata sandi belum tersimpan.'
        : settings.lastVerifiedAt
          ? `Teruji ${formatDateTimeWIB(settings.lastVerifiedAt)}`
          : 'Belum diuji — klik Uji Koneksi.',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className="gap-3 py-4">
          <CardContent className="flex min-w-0 flex-col gap-2 px-4">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
              <t.icon
                className={cn('size-4', t.icon === Loader2 && 'animate-spin text-primary')}
                aria-hidden
              />
              {t.label}
            </p>
            <div className="min-w-0">{t.primary}</div>
            {t.secondary && (
              <p className="line-clamp-2 text-xs text-muted-foreground" title={String(t.secondary)}>
                {t.secondary}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function runSummary(run: GojekPortalSyncRun): string {
  const rows = (run.importedRows ?? 0).toLocaleString('id-ID');
  return `${formatDateRangeID(run.dateFrom, run.dateTo)} · ${rows} baris`;
}
