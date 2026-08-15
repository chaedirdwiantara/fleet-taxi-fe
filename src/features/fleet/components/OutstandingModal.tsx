import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import {
  formatDateShortID,
  monthRangeShortID,
  monthYearLabelID,
  monthYearShortID,
} from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import type { MonitoringMode } from '../searchSchema';
import type { OutstandingBreakdown } from '../types';

// "Rincian Outstanding" — the audit trail behind one Outstanding Total cell.
//
// The cell holds an all-history balance, which on its own cannot be checked: a
// plate whose current driver is fully settled still looks indebted because it
// carries what earlier drivers left behind. So the same balance is shown read
// two ways, both backend-computed from the very same rows as the cell itself:
//   • per contributor — WHO left the remainder, over which dates. The
//     contributor is the opposite identity of the row: drivers for a plate row,
//     plates for a driver row.
//   • per month — WHICH months moved it, with the running balance, so
//     "settled every month yet the total is huge" shows its cause.
//
// Narrow screens keep the subject and the figure that answers the question
// (Sisa / Saldo); the operands behind it move under the label instead of off
// the side of a scrolling table, so nothing has to be swiped into view.

/** Owing is red, credit is green — the same reading as the cell it opened from. */
function signTone(value: number): string | undefined {
  if (value > 0) return 'text-red-600 dark:text-red-400';
  if (value < 0) return 'text-emerald-600 dark:text-emerald-400';
  return undefined;
}

/** Column that folds into the label cell below `sm`. */
const FOLDED = 'hidden text-right sm:table-cell';
// TableCell is nowrap by default, which would push the folded operands back off
// the side of the screen — exactly what folding them in was meant to avoid.
const foldedNote =
  'mt-0.5 block text-xs font-normal whitespace-normal text-muted-foreground sm:hidden';

export function OutstandingModal({
  subject,
  breakdown,
  month,
  year,
  mode = 'plate',
  onClose,
}: {
  /** The row's own identity — a plate, or the person in driver mode. */
  subject: string;
  breakdown: OutstandingBreakdown;
  month: number;
  year: number;
  mode?: MonitoringMode;
  onClose: () => void;
}) {
  const contributorNoun = mode === 'driver' ? 'plat' : 'driver';
  const { parts, months, total } = breakdown;
  const partsTotal = parts.reduce((sum, p) => ({ due: sum.due + p.due, paid: sum.paid + p.paid }), {
    due: 0,
    paid: 0,
  });
  // Same span the grid cell captions itself with — one definition, so the modal
  // and the cell it opened from can never word it differently.
  const span =
    breakdown.rangeFrom && breakdown.rangeTo
      ? monthRangeShortID(breakdown.rangeFrom, breakdown.rangeTo)
      : null;
  const operands = (due: number, paid: number) =>
    `Target ${formatRupiah(due)} · Dibayar ${formatRupiah(paid)}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-4 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <Scale className="size-5 text-muted-foreground" aria-hidden />
            Rincian Outstanding
          </DialogTitle>
          <DialogDescription>
            {subject} · saldo berjalan s/d {monthYearLabelID(month, year)}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-slim max-h-[65svh] space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
          {/* The figure the cell showed, restated as the thing the tables explain */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border bg-muted/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">Saldo berjalan</span>
            <span className={cn('text-xl font-semibold tabular-nums', signTone(total))}>
              {formatRupiah(total)}
            </span>
            {span && (
              <span className="w-full text-xs text-muted-foreground">
                Terbentuk dari {breakdown.contributorCount} {contributorNoun} · {span}
              </span>
            )}
          </div>

          {parts.length === 0 && months.length === 0 ? (
            <EmptyState
              icon={Scale}
              title="Belum ada riwayat"
              description="Belum ada baris tagihan maupun setoran yang membentuk saldo ini."
            />
          ) : (
            <>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Penyumbang saldo per {contributorNoun}</h3>
                <Table className="text-xs sm:min-w-[30rem] sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{mode === 'driver' ? 'Plat' : 'Driver'}</TableHead>
                      <TableHead className={FOLDED}>Target (Due)</TableHead>
                      <TableHead className={FOLDED}>Dibayar</TableHead>
                      <TableHead className="text-right">Sisa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parts.map((part) => (
                      <TableRow key={`${part.label}-${part.from}`}>
                        <TableCell className="font-medium whitespace-normal">
                          {part.label}
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                            {part.from === part.to
                              ? formatDateShortID(part.from)
                              : `${formatDateShortID(part.from)} – ${formatDateShortID(part.to)}`}
                          </span>
                          <span className={foldedNote}>{operands(part.due, part.paid)}</span>
                        </TableCell>
                        <TableCell className={cn(FOLDED, 'whitespace-nowrap tabular-nums')}>
                          {formatRupiah(part.due)}
                        </TableCell>
                        <TableCell className={cn(FOLDED, 'whitespace-nowrap tabular-nums')}>
                          {formatRupiah(part.paid)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right align-top font-semibold whitespace-nowrap tabular-nums sm:align-middle',
                            signTone(part.delta),
                          )}
                        >
                          {formatRupiah(part.delta)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell>
                        TOTAL
                        <span className={foldedNote}>
                          {operands(partsTotal.due, partsTotal.paid)}
                        </span>
                      </TableCell>
                      <TableCell className={cn(FOLDED, 'whitespace-nowrap tabular-nums')}>
                        {formatRupiah(partsTotal.due)}
                      </TableCell>
                      <TableCell className={cn(FOLDED, 'whitespace-nowrap tabular-nums')}>
                        {formatRupiah(partsTotal.paid)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right align-top whitespace-nowrap tabular-nums sm:align-middle',
                          signTone(partsTotal.due - partsTotal.paid),
                        )}
                      >
                        {formatRupiah(partsTotal.due - partsTotal.paid)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Pergerakan per bulan</h3>
                <Table className="text-xs sm:min-w-[34rem] sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bulan</TableHead>
                      <TableHead className={FOLDED}>Target (Due)</TableHead>
                      <TableHead className={FOLDED}>Dibayar</TableHead>
                      <TableHead className={FOLDED}>Selisih</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {months.map((m) => (
                      <TableRow key={m.ym}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {monthYearShortID(m.ym)}
                          <span className={foldedNote}>
                            Selisih {formatRupiah(m.delta)} · {operands(m.due, m.paid)}
                          </span>
                        </TableCell>
                        <TableCell className={cn(FOLDED, 'whitespace-nowrap tabular-nums')}>
                          {formatRupiah(m.due)}
                        </TableCell>
                        <TableCell className={cn(FOLDED, 'whitespace-nowrap tabular-nums')}>
                          {formatRupiah(m.paid)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            FOLDED,
                            'whitespace-nowrap tabular-nums',
                            signTone(m.delta),
                          )}
                        >
                          {formatRupiah(m.delta)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right align-top font-semibold whitespace-nowrap tabular-nums sm:align-middle',
                            signTone(m.balance),
                          )}
                        >
                          {formatRupiah(m.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            </>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Saldo = Σ target setoran (baris <em>due</em>) − Σ pelunasan (deduction + manual payment
            yang sudah diproses, <strong>termasuk yang ditandai Tidak Masuk Setoran</strong> —
            kewajibannya tetap dianggap beres, hanya tidak dihitung sebagai omset). Hari rental /
            bebas setoran tidak ditagih maupun dihitung setor. Data Mentah Tanpa Plat belum masuk
            hitungan sampai diproses.
          </p>
        </div>

        <DialogFooter className="border-t px-4 py-3 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
