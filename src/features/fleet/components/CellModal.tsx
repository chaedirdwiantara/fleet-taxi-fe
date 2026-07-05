import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useGojekCellQuery } from '../hooks/useFleetQueries';
import { monthYearLabelID } from '@/lib/datetime';
import { formatNumberID as nf } from '@/lib/money';

// Faithful port of the legacy "Detail Transaksi" breakdown modal: per-item
// display vs counted amounts, display-only badge, notes, and both totals.
export function CellModal({
  plate,
  day,
  month,
  year,
  onClose,
}: {
  plate: string;
  day: number;
  month: number;
  year: number;
  onClose: () => void;
}) {
  const breakdown = useGojekCellQuery({ plate, day, month, year, enabled: true });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Detail Transaksi</DialogTitle>
          <DialogDescription>
            {plate} · {day} {monthYearLabelID(month, year)}
          </DialogDescription>
        </DialogHeader>

        {breakdown.isPending && <p className="py-4 text-sm text-muted-foreground">Memuat rincian…</p>}
        {breakdown.isError && (
          <p className="py-4 text-sm text-destructive">Gagal memuat: {breakdown.error.message}</p>
        )}
        {breakdown.isSuccess && (
          <div className="text-sm">
            <table className="w-full">
              <tbody>
                {breakdown.data.items.map((item, i) => (
                  <tr key={i} className="border-b align-top">
                    <td className="py-1.5 pr-2">
                      {item.label}
                      {item.isDisplayOnly && (
                        <Badge variant="secondary" className="ml-1 text-[10px]">
                          Display only
                        </Badge>
                      )}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {nf(item.displayAmount)}
                      {item.countedAmount !== item.displayAmount && (
                        <div className="text-[11px] text-muted-foreground">
                          Counted: {nf(item.countedAmount)}
                        </div>
                      )}
                      {item.note && (
                        <div className="text-[11px] text-amber-600">Keterangan: {item.note}</div>
                      )}
                    </td>
                  </tr>
                ))}
                {breakdown.data.items.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-3 text-center text-muted-foreground">
                      Tidak ada transaksi.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-semibold">
                  <td className="py-1.5 pr-2">Total Display</td>
                  <td className="py-1.5 text-right tabular-nums">{nf(breakdown.data.displayTotal)}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-1.5 pr-2">Total Counted</td>
                  <td className="py-1.5 text-right tabular-nums">{nf(breakdown.data.countedTotal)}</td>
                </tr>
              </tfoot>
            </table>
            {breakdown.data.hasDisplayOnlyManualPayment && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Manual Payment berlabel display-only tetap tampil di sel, tetapi tidak masuk
                hitung setoran.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
