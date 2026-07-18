import { useState } from 'react';
import { ChevronDown, ChevronUp, Inbox, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateID } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import type { RawManualRow } from '../types';

// "Data Mentah Tanpa Plat" — collapsible queue of Manual Payment rows imported
// without a plate. They sit OUTSIDE the monitoring table & summary until an
// admin processes them (isi plat & status setoran); after processing the record
// merges into its plate's row and counts toward omset. Admin surface only —
// the partner grid never receives raw rows (server-side plate scoping).
export function RawDataPanel({
  rows,
  totalAmount,
  onProcess,
}: {
  rows: RawManualRow[];
  totalAmount: number;
  onProcess: (detailId: number) => void;
}) {
  const [open, setOpen] = useState(true);
  if (rows.length === 0) return null;

  return (
    <section className="rounded-lg border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-center gap-2 rounded-t-lg px-3 py-2.5 text-left hover:bg-muted/40 sm:px-4"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Inbox className="size-4" aria-hidden />
        </span>
        <span className="text-sm font-semibold">Data Mentah Tanpa Plat</span>
        <Badge variant="secondary">{rows.length} entri</Badge>
        <span className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Total <span className="font-semibold text-foreground">{formatRupiah(totalAmount)}</span>
          </span>
          {open ? (
            <ChevronUp className="size-4 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
          )}
        </span>
      </button>

      {open && (
        <div className="border-t">
          <p className="px-3 pt-2 text-xs text-muted-foreground sm:px-4">
            Manual payment yang belum masuk hitungan summary. Alur: proses (isi plat &amp; status
            setoran) → data tampil di tabel &amp; masuk hitungan.
          </p>
          <div className="overflow-x-auto p-3 sm:p-4">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-2 py-1.5 font-medium">No</th>
                  <th className="px-2 py-1.5 font-medium">Tanggal</th>
                  <th className="px-2 py-1.5 font-medium">Driver</th>
                  <th className="px-2 py-1.5 text-right font-medium">Nominal</th>
                  <th className="px-2 py-1.5 text-center font-medium">Status</th>
                  <th className="px-2 py-1.5 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.detailId} className={cn('border-b', i % 2 === 1 && 'bg-muted/20')}>
                    <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {formatDateID(row.transactionDate)}
                    </td>
                    <td className="max-w-56 truncate px-2 py-2" title={row.driverName}>
                      {row.driverName || '-'}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold whitespace-nowrap tabular-nums">
                      {formatRupiah(row.amount)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Badge variant="secondary">Belum diolah</Badge>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button size="sm" onClick={() => onProcess(row.detailId)}>
                        <Wand2 aria-hidden /> Proses / Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
