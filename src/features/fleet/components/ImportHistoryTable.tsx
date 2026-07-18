import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { formatDateTimeWIB, monthYearLabelID } from '@/lib/datetime';
import type { Platform } from '@/lib/query-client';
import { useImportsQuery, useRollbackImport, type ImportBatch } from '../hooks/useImports';

function StatusBadge({ status }: { status: ImportBatch['status'] }) {
  const variant = status === 'done' ? 'default' : status === 'failed' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{status}</Badge>;
}

// Riwayat Import (Rollback): faithful port of the legacy import-list table.
// Deleting a batch permanently drops EVERY deposit row parsed from that file
// (legacy getDeleteImport / getRollback) — the grid recomputes afterwards.
export function ImportHistoryTable({ platform }: { platform: Platform }) {
  const imports = useImportsQuery(platform);
  const rollback = useRollbackImport(platform);

  return (
    <div className="max-h-[60vh] overflow-auto rounded-md border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="sticky top-0 z-10 bg-background text-left text-xs text-muted-foreground">
          <tr className="[&>th]:border-b [&>th]:px-3 [&>th]:py-2">
            <th>Nama File</th>
            <th>Periode</th>
            <th>Diunggah Oleh</th>
            <th>Status</th>
            <th className="text-right">Baris</th>
            <th>Waktu</th>
            <th className="text-center">Rollback</th>
          </tr>
        </thead>
        <tbody>
          {imports.isPending && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                Memuat riwayat…
              </td>
            </tr>
          )}
          {imports.isError && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-destructive">
                Gagal memuat riwayat: {imports.error.message}
              </td>
            </tr>
          )}
          {imports.data?.map((batch) => (
            <tr key={batch.id} className="[&>td]:border-b [&>td]:px-3 [&>td]:py-2">
              <td className="max-w-48 truncate font-medium" title={batch.filename}>
                {batch.filename}
              </td>
              <td className="whitespace-nowrap">
                {monthYearLabelID(batch.periodMonth, batch.periodYear)}
              </td>
              <td className="whitespace-nowrap text-muted-foreground">
                {batch.uploaderName ?? 'Sistem / Tidak Diketahui'}
              </td>
              <td>
                <StatusBadge status={batch.status} />
              </td>
              <td className="text-right tabular-nums">
                {(batch.totalRows ?? 0).toLocaleString('id-ID')}
              </td>
              <td className="text-xs whitespace-nowrap text-muted-foreground">
                {formatDateTimeWIB(batch.createdAt)}
              </td>
              <td className="text-center">
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
                        Ini menghapus <strong>permanen</strong> SEMUA baris setoran dari file “
                        {batch.filename}” ({monthYearLabelID(batch.periodMonth, batch.periodYear)}).
                        Grid akan dihitung ulang. Aksi ini tidak bisa dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => rollback.mutate(batch.id)}
                      >
                        Hapus &amp; Rollback
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </td>
            </tr>
          ))}
          {imports.isSuccess && imports.data.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                Belum ada riwayat import.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
