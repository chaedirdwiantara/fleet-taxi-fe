import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useGojekCellQuery, usePartnerGojekCellQuery } from '../hooks/useFleetQueries';
import type { MonitoringMode } from '../searchSchema';
import { monthYearLabelID } from '@/lib/datetime';
import { formatNumberID as nf } from '@/lib/money';

// Faithful port of the legacy "Detail Transaksi" breakdown modal: per-item
// display vs counted amounts, display-only badge, notes, and both totals.
// `scope` picks the admin vs partner-scoped endpoint (same response shape).
export function CellModal({
  plate,
  day,
  month,
  year,
  onClose,
  scope = 'admin',
  mode = 'plate',
  onEditDetail,
}: {
  // Row key: a normalized plate, or `drv:<NAME>` when the grid is read per driver.
  plate: string;
  day: number;
  month: number;
  year: number;
  onClose: () => void;
  scope?: 'admin' | 'partner';
  // Must match the grid the cell was clicked in — the backend resolves the row
  // key against a grid built in that mode.
  mode?: MonitoringMode;
  // Admin-only: re-open a Manual Payment record in the Proses/Edit form (fix a
  // wrong Masuk/Tidak Masuk Setoran choice). Rendered per backing detail id.
  onEditDetail?: (detailId: number) => void;
}) {
  const adminQuery = useGojekCellQuery({
    plate,
    day,
    month,
    year,
    mode,
    enabled: scope === 'admin',
  });
  const partnerQuery = usePartnerGojekCellQuery({
    plate,
    day,
    month,
    year,
    mode,
    enabled: scope === 'partner',
  });
  const breakdown = scope === 'partner' ? partnerQuery : adminQuery;
  // Driver rows carry the `drv:` prefix internally; the dialog shows the name.
  const subject = plate.startsWith('drv:') ? plate.slice(4) || 'Tanpa nama driver' : plate;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Detail Transaksi</DialogTitle>
          <DialogDescription>
            {subject} · {day} {monthYearLabelID(month, year)}
          </DialogDescription>
        </DialogHeader>

        {breakdown.isPending && (
          <p className="py-4 text-sm text-muted-foreground">Memuat rincian…</p>
        )}
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
                        <Badge variant="secondary" className="ml-1 text-xs">
                          Display only
                        </Badge>
                      )}
                      {scope === 'admin' && onEditDetail && (item.detailIds?.length ?? 0) > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {item.detailIds!.map((id, n) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => onEditDetail(id)}
                              className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="size-3" aria-hidden />
                              Edit{item.detailIds!.length > 1 ? ` #${n + 1}` : ''}
                            </button>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {nf(item.displayAmount)}
                      {item.countedAmount !== item.displayAmount && (
                        <div className="text-xs text-muted-foreground">
                          Counted: {nf(item.countedAmount)}
                        </div>
                      )}
                      {item.note && (
                        <div className="text-xs text-amber-600">Keterangan: {item.note}</div>
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
                  <td className="py-1.5 text-right tabular-nums">
                    {nf(breakdown.data.displayTotal)}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-1.5 pr-2">Total Counted</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {nf(breakdown.data.countedTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
            {breakdown.data.hasDisplayOnlyManualPayment && (
              <p className="mt-2 text-xs text-muted-foreground">
                Manual Payment berlabel display-only tetap tampil di sel, tetapi tidak masuk hitung
                setoran.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
