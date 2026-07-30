import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateID } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import type { MonitoringMode } from '@/features/fleet/searchSchema';
import { usePartnerAllFleetCellQuery } from '../hooks';
import { SOURCE_META } from '../lib/sourceTone';

// The transactions behind one matrix cell, grouped per income source: Gojek
// setoran items, Grab imported rows, Rental bookings covering that day. Every
// amount comes from the backend; Σ items of a source equals that source's slice
// of the cell by construction.
export function AllFleetCellModal({
  cellKey,
  day,
  month,
  year,
  mode,
  onClose,
}: {
  cellKey: string;
  day: number;
  month: number;
  year: number;
  mode: MonitoringMode;
  onClose: () => void;
}) {
  const cell = usePartnerAllFleetCellQuery({
    key: cellKey,
    day,
    month,
    year,
    mode,
    enabled: true,
  });
  const dateLabel = formatDateID(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85svh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rincian Transaksi</DialogTitle>
          <DialogDescription>
            {cell.data?.label ?? cellKey} · {dateLabel}
          </DialogDescription>
        </DialogHeader>

        {cell.isPending && <p className="py-4 text-sm text-muted-foreground">Memuat rincian…</p>}
        {cell.isError && (
          <p className="py-4 text-sm text-destructive">Gagal memuat: {cell.error.message}</p>
        )}
        {cell.isSuccess && (
          <div className="space-y-4">
            {cell.data.sources.map((source) => (
              <section key={source.source}>
                <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                  <span
                    className={`inline-block size-3 rounded-sm ${SOURCE_META[source.source].swatch}`}
                    aria-hidden
                  />
                  {SOURCE_META[source.source].label}
                  <span className="ml-auto tabular-nums">{formatRupiah(source.total)}</span>
                </h3>
                <table className="w-full text-sm">
                  <tbody>
                    {source.items.map((item, i) => (
                      <tr key={`${item.label}-${i}`} className="border-b align-top">
                        <td className="py-1.5 pr-2">
                          <span className="block">{item.label}</span>
                          {item.sublabel && (
                            <span className="block text-xs text-muted-foreground">
                              {item.sublabel}
                            </span>
                          )}
                          {item.note && (
                            <span className="block text-xs text-amber-600">{item.note}</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatRupiah(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}

            <div className="flex justify-between border-t pt-2 text-sm font-semibold">
              <span>Total hari ini</span>
              <span className="tabular-nums">{formatRupiah(cell.data.total)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
