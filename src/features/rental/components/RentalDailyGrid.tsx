import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { monthYearLabelID } from '@/lib/datetime';
import { formatNumberID, formatRupiah } from '@/lib/money';
import {
  frozenPrefixCount,
  frozenWidth,
  identityWidth,
  stickyLefts,
  type IdentityCol,
} from '@/features/fleet/components/stickyGrid';
import { dayTone, formatUtilization, isClickable, toneClass } from '../lib/rentalDayTone';
import type { RentalGrid, RentalGridRow } from '../types';

// Plate × day pivot of the partner's rental month — the rental sibling of the
// Gojek and Grab grids, and it borrows their mechanics wholesale (frozen
// identity prefix, two-row sticky header, sticky TOTAL row). What differs is
// what a colour means: rental has no daily target, so a cell is green once the
// booking is settled and amber while the money is still outstanding.

const IDENTITY: IdentityCol[] = [
  { id: 'no', label: 'No', width: 44 },
  { id: 'plate', label: 'Plat', width: 132 },
  { id: 'type', label: 'Tipe', width: 118 },
];
const DAY_W = 74;
const SUMMARY: IdentityCol[] = [
  { id: 'omset', label: 'Total Omset', width: 128 },
  { id: 'cogs', label: 'Total COGS', width: 122 },
  { id: 'nett', label: 'Nett Profit', width: 122 },
  { id: 'rentedDays', label: 'Hari Tersewa', width: 104 },
  { id: 'utilization', label: 'Utilisasi', width: 92 },
];

const HEAD_BG = 'bg-primary text-primary-foreground';
const SUMMARY_BG = 'bg-green-600 text-white';
const nf = formatNumberID;
const rp = formatRupiah;

/** "12 Jul – 18 Jul · Budi" — the booking spans behind a row, for its tooltip. */
function bookingsTitle(row: RentalGridRow): string | undefined {
  if (row.bookings.length === 0) return undefined;
  return row.bookings
    .map((b) =>
      [
        `${b.displayStartDate} → ${b.displayEndDate}`,
        b.customerName || 'Tanpa nama penyewa',
        b.paymentStatus,
      ].join(' · '),
    )
    .join('\n');
}

export function RentalDailyGrid({
  grid,
  onCellClick,
}: {
  grid: RentalGrid;
  onCellClick: (plateNorm: string, day: number) => void;
}) {
  const frozenCount = useMemo(() => frozenPrefixCount(IDENTITY, 'plate'), []);
  const lefts = useMemo(() => stickyLefts(IDENTITY, frozenCount), [frozenCount]);
  const idW = identityWidth(IDENTITY);
  const frozenW = useMemo(() => frozenWidth(IDENTITY, frozenCount), [frozenCount]);
  const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);
  const monthLabel = monthYearLabelID(grid.month, grid.year);

  const cellBase = (left?: number) =>
    cn(
      left !== undefined && 'sticky z-10',
      'border-b bg-white group-hover:bg-slate-50 dark:bg-slate-950',
    );
  const lastBorder = (isLast: boolean, isLastFrozen: boolean) =>
    isLast || isLastFrozen ? 'border-r-2 border-r-slate-300' : 'border-r';

  return (
    <div className="relative scrollbar-slim max-h-none overflow-auto rounded-lg border md:max-h-[78svh]">
      <table
        className="border-separate border-spacing-0 text-xs"
        style={{ minWidth: idW + days.length * DAY_W + identityWidth(SUMMARY) }}
      >
        <thead>
          <tr>
            {IDENTITY.map((col, i) => (
              <th
                key={col.id}
                rowSpan={2}
                className={cn(
                  'sticky top-0 border-b border-indigo-300/40 px-2 py-2 text-center font-semibold',
                  lefts[i] !== undefined ? 'z-30' : 'z-20',
                  HEAD_BG,
                  lastBorder(i === IDENTITY.length - 1, i === frozenCount - 1),
                )}
                style={{ left: lefts[i], width: col.width, minWidth: col.width }}
              >
                {col.label}
              </th>
            ))}
            <th
              colSpan={days.length}
              className={cn(
                'sticky top-0 z-20 h-8 border-r border-b border-indigo-300/40 px-2 py-0 text-left align-middle font-semibold',
                HEAD_BG,
              )}
            >
              {/* pinned past the frozen columns so the label stays readable
                  while the ~31-day band scrolls horizontally */}
              <span className="sticky inline-block w-fit" style={{ left: frozenW + 12 }}>
                Tanggal ({monthLabel})
              </span>
            </th>
            <th
              colSpan={SUMMARY.length}
              className={cn(
                'sticky top-0 z-20 h-8 border-b border-l-2 border-l-slate-300 px-2 py-0 text-center align-middle font-semibold',
                SUMMARY_BG,
              )}
            >
              Ringkasan Bulan Ini
            </th>
          </tr>
          <tr>
            {days.map((day) => (
              <th
                key={day}
                className={cn(
                  'sticky top-8 z-20 border-r border-b border-indigo-300/30 px-1 py-1 text-center font-medium',
                  HEAD_BG,
                )}
                style={{ width: DAY_W, minWidth: DAY_W }}
              >
                {day}
              </th>
            ))}
            {SUMMARY.map((col, i) => (
              <th
                key={col.id}
                className={cn(
                  'sticky top-8 z-20 border-r border-b px-1 py-1 text-center font-medium',
                  SUMMARY_BG,
                  i === 0 && 'border-l-2 border-l-slate-300',
                )}
                style={{ width: col.width, minWidth: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {grid.rows.map((row, idx) => {
            const idle = row.totals.rentedDays === 0;
            return (
              <tr key={row.plateNorm} className="group">
                {IDENTITY.map((col, colIdx) => {
                  const left = lefts[colIdx];
                  const base = cn(
                    cellBase(left),
                    lastBorder(colIdx === IDENTITY.length - 1, colIdx === frozenCount - 1),
                  );
                  const style = { left, width: col.width, maxWidth: col.width };

                  if (col.id === 'no') {
                    return (
                      <td
                        key={col.id}
                        className={cn(base, 'px-2 py-1 text-center text-slate-500')}
                        style={style}
                      >
                        {idx + 1}
                      </td>
                    );
                  }
                  if (col.id === 'plate') {
                    return (
                      <td
                        key={col.id}
                        className={cn(base, 'px-2 py-1 text-center font-semibold')}
                        style={style}
                        title={bookingsTitle(row)}
                      >
                        <span className="block truncate">{row.plateNumber}</span>
                        {idle && (
                          <span className="block text-xs font-normal text-muted-foreground italic">
                            Tidak tersewa
                          </span>
                        )}
                      </td>
                    );
                  }
                  return (
                    <td
                      key={col.id}
                      className={cn(
                        base,
                        'truncate px-2 py-1 text-center text-slate-600 dark:text-slate-300',
                      )}
                      style={style}
                      title={[row.vehicleType, row.region].filter(Boolean).join(' · ')}
                    >
                      {row.vehicleType || '-'}
                    </td>
                  );
                })}

                {days.map((day) => {
                  const cell = row.days[day];
                  const tone = dayTone(cell);
                  const clickable = isClickable(cell);
                  return (
                    <td
                      key={day}
                      role={clickable ? 'button' : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      aria-label={
                        clickable
                          ? `${row.plateNumber} tanggal ${day}: ${rp(cell!.amount)} — ${cell!.paymentStatus}`
                          : undefined
                      }
                      title={clickable ? `${rp(cell!.amount)} · ${cell!.paymentStatus}` : undefined}
                      className={cn(
                        'border-r border-b px-1 py-1 text-right tabular-nums',
                        toneClass(tone),
                        clickable && 'cursor-pointer hover:brightness-95',
                      )}
                      style={{ width: DAY_W }}
                      onClick={clickable ? () => onCellClick(row.plateNorm, day) : undefined}
                      onKeyDown={
                        clickable
                          ? (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onCellClick(row.plateNorm, day);
                              }
                            }
                          : undefined
                      }
                    >
                      {cell ? nf(cell.amount) : <span aria-hidden>·</span>}
                    </td>
                  );
                })}

                <td className="border-r border-b border-l-2 border-l-slate-300 bg-white px-2 py-1 text-right font-semibold tabular-nums dark:bg-slate-950">
                  {rp(row.totals.omset)}
                </td>
                <td className="border-r border-b bg-white px-2 py-1 text-right tabular-nums dark:bg-slate-950">
                  {rp(row.totals.cogs)}
                </td>
                <td
                  className={cn(
                    'border-r border-b bg-white px-2 py-1 text-right tabular-nums dark:bg-slate-950',
                    row.totals.nett < 0 ? 'text-red-600' : 'text-emerald-600',
                  )}
                >
                  {rp(row.totals.nett)}
                </td>
                <td className="border-r border-b bg-white px-2 py-1 text-right tabular-nums dark:bg-slate-950">
                  {nf(row.totals.rentedDays)} / {nf(grid.daysInMonth)}
                </td>
                <td className="border-r border-b bg-white px-2 py-1 text-right font-semibold tabular-nums dark:bg-slate-950">
                  {formatUtilization(row.totals.rentedDays, grid.daysInMonth)}
                </td>
              </tr>
            );
          })}

          {grid.rows.length === 0 && (
            <tr>
              <td
                colSpan={IDENTITY.length + days.length + SUMMARY.length}
                className="border-b px-3 py-10 text-slate-500"
              >
                {/* sticky: keeps the message inside the visible viewport of the
                    horizontally scrollable pivot */}
                <div className="sticky left-3 w-fit max-w-[calc(100%-1.5rem)]">
                  Belum ada plat maupun transaksi sewa pada periode ini.
                </div>
              </td>
            </tr>
          )}
        </tbody>

        {grid.rows.length > 0 && (
          <tfoot>
            <tr className="font-semibold">
              {/* Split at the frozen boundary: one cell spanning the whole
                  identity block would be pinned as a whole and would cover the
                  day columns as soon as the reader scrolls. */}
              <td
                colSpan={frozenCount}
                className="sticky bottom-0 left-0 z-20 border-r-2 border-b border-r-slate-300 bg-indigo-50 px-2 py-1.5 text-right whitespace-nowrap dark:bg-indigo-950"
              >
                TOTAL
              </td>
              {frozenCount < IDENTITY.length && (
                <td
                  colSpan={IDENTITY.length - frozenCount}
                  className="sticky bottom-0 border-r-2 border-b border-r-slate-300 bg-indigo-50 dark:bg-indigo-950"
                />
              )}
              {days.map((day) => (
                <td
                  key={day}
                  className="sticky bottom-0 border-r border-b bg-indigo-50 px-1 py-1.5 text-right tabular-nums dark:bg-indigo-950"
                  style={{ width: DAY_W }}
                >
                  {grid.dailyTotals[day] ? nf(grid.dailyTotals[day]!) : '—'}
                </td>
              ))}
              <td className="sticky bottom-0 border-r border-b border-l-2 border-l-slate-300 bg-indigo-50 px-2 py-1.5 text-right tabular-nums dark:bg-indigo-950">
                {rp(grid.totals.omset)}
              </td>
              <td className="sticky bottom-0 border-r border-b bg-indigo-50 px-2 py-1.5 text-right tabular-nums dark:bg-indigo-950">
                {rp(grid.totals.cogs)}
              </td>
              <td
                className={cn(
                  'sticky bottom-0 border-r border-b bg-indigo-50 px-2 py-1.5 text-right tabular-nums dark:bg-indigo-950',
                  grid.totals.nett < 0 ? 'text-red-600' : 'text-emerald-600',
                )}
              >
                {rp(grid.totals.nett)}
              </td>
              <td className="sticky bottom-0 border-r border-b bg-indigo-50 px-2 py-1.5 text-right tabular-nums dark:bg-indigo-950">
                {nf(grid.totals.rentedDays)}
              </td>
              <td className="sticky bottom-0 border-r border-b bg-indigo-50 px-2 py-1.5 text-right tabular-nums dark:bg-indigo-950">
                {/* Fleet-wide occupancy: rented days over every plate's days. */}
                {formatUtilization(grid.totals.rentedDays, grid.daysInMonth * grid.plateCount)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
