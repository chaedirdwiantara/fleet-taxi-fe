import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';
import { useImportProgress } from '@/lib/socket/useImportProgress';
import { qk, type Platform } from '@/lib/query-client';
import { useImportStatusQuery, useUploadImport } from '../hooks/useImports';
import { ImportHistoryTable } from './ImportHistoryTable';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Upload → async parse → status. The server can't know the row count upfront
// (streaming parse), so there is NO percentage — we show an honest "processing"
// spinner that resolves to a success/failure message, mirroring the legacy
// "Imported Successfully!" flow. Batch list + rollback live in ImportHistoryTable.
export function ImportPanel({ platform }: { platform: Platform }) {
  const qc = useQueryClient();
  const [activeImportId, setActiveImportId] = useState<number | null>(null);
  const [month, setMonth] = useState(currentMonthWIB());
  const [year, setYear] = useState(currentYearWIB());
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useUploadImport(platform);
  const activeStatus = useImportStatusQuery(platform, activeImportId);
  useImportProgress(platform, activeImportId); // socket patches the cache (fast path)

  const status = activeStatus.data?.status;
  // When the batch finishes — via EITHER the socket or the HTTP poll — refresh
  // the pivot + the batch list so the new data shows without a manual reload.
  useEffect(() => {
    if (status === 'done' || status === 'failed') {
      qc.invalidateQueries({ queryKey: qk.fleet.imports(platform) });
      if (status === 'done') {
        qc.invalidateQueries({ queryKey: ['fleet', platform, 'grid'] });
      }
    }
  }, [status, platform, qc]);

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
            <Input
              id="import-file"
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx"
              required
              className="w-64"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Bulan</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Tahun</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
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
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm">
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
            <div>
              <p className="font-medium">Memproses {active.filename}…</p>
              <p className="text-muted-foreground">
                {(active.processed ?? 0) > 0
                  ? `${active.processed.toLocaleString('id-ID')} baris diproses — mohon tunggu.`
                  : 'Mengunggah & memproses baris, mohon tunggu sebentar.'}
              </p>
            </div>
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

        <ImportHistoryTable platform={platform} />
      </DialogContent>
    </Dialog>
  );
}
