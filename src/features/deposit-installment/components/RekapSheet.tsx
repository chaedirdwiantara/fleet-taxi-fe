import { History } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { formatDateID } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import { useRecapQuery } from '../hooks';
import type { InstallmentRule } from '../types';
import { InstallmentProgress, StatusBadge } from './InstallmentTable';

// Rekap: the derived per-installment payment history of one rule. History is
// computed live from import data, so it shifts when a month is re-imported.
export function RekapSheet({
  rule,
  onClose,
}: {
  rule: InstallmentRule | null;
  onClose: () => void;
}) {
  const recap = useRecapQuery(rule?.id ?? null);

  return (
    <Sheet open={rule != null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Rekap Cicilan</SheetTitle>
          <SheetDescription>{rule?.title}</SheetDescription>
        </SheetHeader>

        {rule && (
          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium" title={rule.driverName}>
                    {rule.driverName}
                  </p>
                  {rule.lastPlate && (
                    <p className="text-xs text-muted-foreground">{rule.lastPlate}</p>
                  )}
                </div>
                <StatusBadge status={rule.status} />
              </div>
              <InstallmentProgress rule={rule} />
              <Separator />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Total Terbayar</dt>
                <dd className="text-right font-medium tabular-nums">
                  {formatRupiah(rule.totalPaid)}
                </dd>
                <dt className="text-muted-foreground">Total Cicilan</dt>
                <dd className="text-right tabular-nums">{formatRupiah(rule.totalTarget)}</dd>
                <dt className="text-muted-foreground">Sisa</dt>
                <dd className="text-right tabular-nums">{formatRupiah(rule.remaining)}</dd>
                {rule.setoranArrears > 0 && (
                  <>
                    <dt className="text-destructive">Kurang Setoran Wajib</dt>
                    <dd className="text-right text-destructive tabular-nums">
                      {formatRupiah(rule.setoranArrears)}
                    </dd>
                  </>
                )}
              </dl>
            </div>

            {recap.isPending && (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}
            {recap.isError && (
              <p className="text-sm text-destructive" role="alert">
                Gagal memuat rekap: {recap.error.message}
              </p>
            )}
            {recap.isSuccess && recap.data.installments.length === 0 && (
              <EmptyState
                icon={History}
                title="Belum ada cicilan terpotong"
                description="Cicilan akan muncul saat driver memiliki hari aktif yang memenuhi syarat setelah tanggal aktif."
              />
            )}
            {recap.isSuccess && recap.data.installments.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Hari</TableHead>
                    <TableHead className="text-right">Setoran Hari Itu</TableHead>
                    <TableHead className="text-right">Potongan</TableHead>
                    <TableHead className="text-right">Kumulatif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recap.data.installments.map((entry) => (
                    <TableRow key={entry.seq}>
                      <TableCell>
                        <span className="text-muted-foreground">ke-{entry.seq}</span>
                        <div className="text-xs whitespace-nowrap">{formatDateID(entry.date)}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRupiah(entry.dailySetoran)}
                        {entry.obligation > 0 && (
                          <div className="text-xs whitespace-nowrap text-muted-foreground">
                            wajib {formatRupiah(entry.obligation)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.amount > 0 ? (
                          formatRupiah(entry.amount)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {entry.arrearsAfter > 0 && (
                          <div className="text-xs whitespace-nowrap text-destructive">
                            kurang {formatRupiah(entry.arrearsAfter)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRupiah(entry.paidCumulative)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <p className="text-xs text-muted-foreground">
              Riwayat dihitung langsung dari data import dan dapat berubah jika data periode diimpor
              ulang.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
