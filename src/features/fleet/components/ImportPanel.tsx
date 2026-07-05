import { useRef, useState } from 'react';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateTimeWIB } from '@/lib/datetime';
import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';
import { useImportProgress } from '@/lib/socket/useImportProgress';
import type { Platform } from '@/lib/query-client';
import {
  useImportsQuery,
  useImportStatusQuery,
  useRollbackImport,
  useUploadImport,
  type ImportBatch,
} from '../hooks/useImports';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function StatusBadge({ status }: { status: ImportBatch['status'] }) {
  const variant =
    status === 'done' ? 'default' : status === 'failed' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{status}</Badge>;
}

// Upload → async parse → progress (socket `import:*` events, HTTP poll
// fallback) → list → destructive rollback (kickoff §6).
export function ImportPanel({ platform }: { platform: Platform }) {
  const [activeImportId, setActiveImportId] = useState<number | null>(null);
  const [month, setMonth] = useState(currentMonthWIB());
  const [year, setYear] = useState(currentYearWIB());
  const fileRef = useRef<HTMLInputElement>(null);

  const imports = useImportsQuery(platform);
  const upload = useUploadImport(platform);
  const rollback = useRollbackImport(platform);
  const activeStatus = useImportStatusQuery(platform, activeImportId);
  useImportProgress(platform, activeImportId); // socket patches the cache

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    upload.mutate(
      { file, month, year },
      { onSuccess: ({ importId }) => setActiveImportId(importId) },
    );
  };

  const active = activeStatus.data;
  const years = Array.from({ length: 4 }, (_, i) => currentYearWIB() - 2 + i);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload aria-hidden /> Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import spreadsheet — {platform}</DialogTitle>
          <DialogDescription>
            Upload CSV/XLSX hasil ekspor portal partner; baris diparse asinkron di server.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="import-file">File (.csv / .xlsx)</Label>
            <Input id="import-file" ref={fileRef} type="file" accept=".csv,.xlsx" required className="w-64" />
          </div>
          <div className="grid gap-1.5">
            <Label>Bulan</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Tahun</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={upload.isPending}>
            {upload.isPending && <Loader2 className="animate-spin" aria-hidden />}
            Upload
          </Button>
        </form>
        {upload.isError && (
          <p className="text-sm text-destructive">Upload gagal: {upload.error.message}</p>
        )}

        {active && (active.status === 'processing' || active.status === 'pending') && (
          <div className="space-y-1 rounded-md border p-3">
            <div className="flex justify-between text-sm">
              <span>Memproses {active.filename}…</span>
              <span className="tabular-nums">
                {(active.processed ?? 0).toLocaleString('id-ID')} /{' '}
                {(active.totalRows ?? 0).toLocaleString('id-ID')} baris
              </span>
            </div>
            <Progress value={active.percent} />
          </div>
        )}
        {active?.status === 'done' && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Import selesai — {(active.totalRows ?? 0).toLocaleString('id-ID')} baris masuk.
          </p>
        )}
        {active?.status === 'failed' && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Import gagal{active.error ? `: ${active.error}` : ''} — batch di-rollback otomatis.
          </p>
        )}

        <div className="max-h-72 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
              <tr className="[&>th]:border-b [&>th]:px-3 [&>th]:py-2">
                <th>File</th>
                <th>Periode</th>
                <th>Status</th>
                <th className="text-right">Baris</th>
                <th>Waktu</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {imports.data?.map((batch) => (
                <tr key={batch.id} className="[&>td]:border-b [&>td]:px-3 [&>td]:py-2">
                  <td className="max-w-40 truncate" title={batch.filename}>{batch.filename}</td>
                  <td>{batch.periodMonth}/{batch.periodYear}</td>
                  <td><StatusBadge status={batch.status} /></td>
                  <td className="text-right tabular-nums">{(batch.totalRows ?? 0).toLocaleString('id-ID')}</td>
                  <td className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTimeWIB(batch.createdAt)}
                  </td>
                  <td className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Rollback ${batch.filename}`}
                          disabled={rollback.isPending}
                        >
                          <Trash2 className="text-destructive" aria-hidden />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rollback batch import ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ini menghapus permanen SEMUA baris dari batch “{batch.filename}”
                            ({batch.periodMonth}/{batch.periodYear}). Grid akan dihitung ulang.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => rollback.mutate(batch.id)}
                          >
                            Rollback
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
              {imports.isSuccess && imports.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    Belum ada import.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
