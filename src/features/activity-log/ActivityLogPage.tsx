import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { formatDateTimeWIB } from '@/lib/datetime';
import { LOGS_PAGE_SIZE, useActivityLogsQuery } from './hooks';
import {
  ACTION_LABELS,
  type ActivityLog,
  type ActivityLogAction,
  type ActivityLogAudience,
} from './types';

const ALL = 'all';

// Audit trail of all accounts (admin console + partner portal). The sidebar
// hides this page for non-super_admins; the backend CASL policy is the real gate.
export function ActivityLogPage() {
  const [audience, setAudience] = useState<string>(ALL);
  const [action, setAction] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // free-text actor search: local state, debounced into the query key
  const [actorText, setActorText] = useState('');
  const [actor, setActor] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      if (actor !== actorText.trim()) {
        setActor(actorText.trim());
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [actorText, actor]);

  const logs = useActivityLogsQuery({
    page,
    audience: audience === ALL ? undefined : (audience as ActivityLogAudience),
    action: action === ALL ? undefined : (action as ActivityLogAction),
    actor: actor || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const total = logs.data?.meta?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / LOGS_PAGE_SIZE));
  const rows = logs.data?.data ?? [];

  const patchFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Log Aktivitas</h2>
        <p className="text-sm text-muted-foreground">
          Riwayat aktivitas seluruh akun — admin console &amp; partner portal.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Select value={audience} onValueChange={(v) => patchFilter(() => setAudience(v))}>
          <SelectTrigger className="w-36" aria-label="Audience">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Akun</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={(v) => patchFilter(() => setAction(v))}>
          <SelectTrigger className="w-44" aria-label="Aksi">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Aksi</SelectItem>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={actorText}
          onChange={(e) => setActorText(e.target.value)}
          placeholder="Cari email akun…"
          className="w-52"
          aria-label="Cari email akun"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => patchFilter(() => setDateFrom(e.target.value))}
          className="w-38"
          aria-label="Dari tanggal"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => patchFilter(() => setDateTo(e.target.value))}
          className="w-38"
          aria-label="Sampai tanggal"
        />
      </div>

      {logs.isError && (
        <p className="text-sm text-destructive">Gagal memuat log: {logs.error.message}</p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Waktu (WIB)</TableHead>
              <TableHead>Akun</TableHead>
              <TableHead>Aktor</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={logs.isFetching ? 'opacity-60 transition-opacity' : undefined}>
            {logs.isPending &&
              Array.from({ length: 8 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {logs.isSuccess && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={ScrollText}
                    title="Belum ada log aktivitas"
                    description="Aktivitas login dan perubahan data akan tercatat di sini."
                  />
                </TableCell>
              </TableRow>
            )}
            {rows.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground tabular-nums">
          {total.toLocaleString('id-ID')} log · Halaman {page} dari {pageCount}
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
    </div>
  );
}

function LogRow({ log }: { log: ActivityLog }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap tabular-nums">
        {formatDateTimeWIB(log.createdAt)}
      </TableCell>
      <TableCell>
        <Badge variant={log.audience === 'admin' ? 'default' : 'secondary'}>
          {log.audience === 'admin' ? 'Admin' : 'Partner'}
        </Badge>
      </TableCell>
      <TableCell className="max-w-52">
        <span className="block truncate font-medium">{log.actorEmail}</span>
        {log.actorName && (
          <span className="block truncate text-xs text-muted-foreground">{log.actorName}</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {ACTION_LABELS[log.action as ActivityLogAction] ?? log.action}
      </TableCell>
      <TableCell className="max-w-72">
        <span className="block truncate font-mono text-xs">
          {log.method} {log.path}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant={log.status === 'success' ? 'outline' : 'destructive'}>
          {log.status === 'success' ? 'Sukses' : 'Gagal'}
        </Badge>
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
        {log.ip ?? '—'}
      </TableCell>
    </TableRow>
  );
}
