import { useMemo } from 'react';
import { MoreHorizontal, Pencil, PlusCircle, CalendarClock, History } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { cellTone, toneClass, toneClickable } from '../lib/thresholds';
import { monthYearLabelID } from '@/lib/datetime';
import { formatNumberID, formatRupiah } from '@/lib/money';
import type { FleetGrid, FleetRow } from '../types';
import { groupRowSpans, identityWidth, stickyLefts, type IdentityCol } from './stickyGrid';

// Faithful port of the legacy Gojek pivot (_table.blade.php): two-row sticky
// blue header, frozen identity columns, rental-partner rowspan grouping,
// 8-tone day cells, Total Deduction / Due / Gap / Outstanding, and a TOTAL row.
// Rendered in the modern shadcn shell; horizontally scrollable on mobile.

const IDENTITY: IdentityCol[] = [
  { id: 'no', label: 'No', width: 44 },
  { id: 'rentalPartner', label: 'Rental Partner', width: 130 },
  { id: 'region', label: 'Region', width: 90 },
  { id: 'plate', label: 'Plate', width: 110 },
  { id: 'type', label: 'Type', width: 140 },
  { id: 'setoran', label: 'Setoran', width: 92 },
  { id: 'aksi', label: 'Aksi', width: 56 },
];
const DAY_W = 62;
const SUMMARY: IdentityCol[] = [
  { id: 'totalDeduction', label: 'Total Deduction', width: 128 },
  { id: 'totalDue', label: 'Total Due (Target)', width: 128 },
  { id: 'gap', label: 'Gap', width: 104 },
  { id: 'outstanding', label: 'Outstanding', width: 132 },
];

const HEAD_BG = 'bg-[#3f51b5] text-white';
const SUMMARY_BG = 'bg-[#4CAF50] text-white';
const nf = formatNumberID;
const rp = formatRupiah;

type Props = {
  grid: FleetGrid;
  onCellClick: (plateNorm: string, day: number) => void;
  onEditTarget: (plateNorm: string) => void;
  onManageException: (plateNorm: string) => void;
  onDriverHistory: (row: FleetRow) => void;
};

export function GojekMonitoringTable({
  grid,
  onCellClick,
  onEditTarget,
  onManageException,
  onDriverHistory,
}: Props) {
  const lefts = useMemo(() => stickyLefts(IDENTITY), []);
  const idW = useMemo(() => identityWidth(IDENTITY), []);
  const rpSpans = useMemo(() => groupRowSpans(grid.rows, (r) => r.rentalPartner), [grid.rows]);
  const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);
  const monthLabel = monthYearLabelID(grid.month, grid.year);

  return (
    <div className="relative max-h-[78svh] overflow-auto rounded-lg border">
      <table className="border-separate border-spacing-0 text-xs" style={{ minWidth: idW + days.length * DAY_W + identityWidth(SUMMARY) }}>
        <thead>
          {/* Row 1: identity (rowspan 2) + Tanggal group + Summary group */}
          <tr>
            {IDENTITY.map((c, i) => (
              <th
                key={c.id}
                rowSpan={2}
                className={cn(
                  'sticky top-0 z-30 border-b border-r border-indigo-300/40 px-2 py-2 text-center font-semibold',
                  HEAD_BG,
                  c.id === 'aksi' && 'border-r-2 border-r-slate-300',
                )}
                style={{ left: lefts[i], width: c.width, minWidth: c.width }}
              >
                {c.label}
              </th>
            ))}
            <th
              colSpan={days.length}
              className={cn('sticky top-0 z-20 border-b border-r border-indigo-300/40 px-2 py-1.5 text-center font-semibold', HEAD_BG)}
            >
              Tanggal ({monthLabel})
            </th>
            <th
              colSpan={SUMMARY.length}
              className={cn('sticky top-0 z-20 border-b border-l-2 border-l-slate-300 px-2 py-1.5 text-center font-semibold', SUMMARY_BG)}
            >
              Summary
            </th>
          </tr>
          {/* Row 2: day numbers + summary sub-headers */}
          <tr>
            {days.map((d) => (
              <th
                key={d}
                className={cn('sticky top-[33px] z-20 border-b border-r border-indigo-300/30 px-1 py-1 text-center font-medium', HEAD_BG)}
                style={{ width: DAY_W, minWidth: DAY_W }}
              >
                {d}
              </th>
            ))}
            {SUMMARY.map((c, i) => (
              <th
                key={c.id}
                className={cn(
                  'sticky top-[33px] z-20 border-b border-r px-1 py-1 text-center font-medium',
                  SUMMARY_BG,
                  i === 0 && 'border-l-2 border-l-slate-300',
                )}
                style={{ width: c.width, minWidth: c.width }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {grid.rows.map((row, idx) => {
            const gap = row.summary.gap;
            const outstanding = row.summary.outstanding;
            return (
              <tr key={row.plateNorm} className="group">
                <td
                  className="sticky z-10 border-b border-r bg-white px-2 py-1 text-center text-slate-500 group-hover:bg-slate-50 dark:bg-slate-950"
                  style={{ left: lefts[0], width: IDENTITY[0].width }}
                >
                  {idx + 1}
                </td>
                {rpSpans[idx] !== undefined && (
                  <td
                    rowSpan={rpSpans[idx]}
                    className="sticky z-10 border-b border-r bg-slate-50 px-2 py-1 text-center align-middle font-semibold dark:bg-slate-900"
                    style={{ left: lefts[1], width: IDENTITY[1].width }}
                  >
                    {row.rentalPartner || '-'}
                  </td>
                )}
                <td
                  className="sticky z-10 border-b border-r bg-slate-50/70 px-2 py-1 text-center dark:bg-slate-900/70"
                  style={{ left: lefts[2], width: IDENTITY[2].width }}
                >
                  {row.regionName}
                </td>
                <td
                  className="sticky z-10 truncate border-b border-r bg-white px-2 py-1 text-center font-semibold group-hover:bg-slate-50 dark:bg-slate-950"
                  style={{ left: lefts[3], width: IDENTITY[3].width, maxWidth: IDENTITY[3].width }}
                  title={row.plateRaw}
                >
                  {row.plateRaw}
                </td>
                <td
                  className="sticky z-10 truncate border-b border-r bg-white px-2 py-1 text-center text-slate-600 group-hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300"
                  style={{ left: lefts[4], width: IDENTITY[4].width, maxWidth: IDENTITY[4].width }}
                  title={row.vehicleType}
                >
                  {row.vehicleType || '-'}
                </td>
                <td
                  className="sticky z-10 border-b border-r bg-white px-2 py-1 text-right tabular-nums group-hover:bg-slate-50 dark:bg-slate-950"
                  style={{ left: lefts[5], width: IDENTITY[5].width }}
                >
                  {nf(row.dailyTarget)}
                </td>
                <td
                  className="sticky z-10 border-b border-r-2 border-r-slate-300 bg-white px-1 py-1 text-center group-hover:bg-slate-50 dark:bg-slate-950"
                  style={{ left: lefts[6], width: IDENTITY[6].width }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Aksi ${row.plateRaw}`}
                      className="inline-flex size-6 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditTarget(row.plateNorm)}>
                        {row.carId ? (
                          <>
                            <Pencil className="text-amber-500" /> Edit Detail &amp; Target
                          </>
                        ) : (
                          <>
                            <PlusCircle className="text-red-500" /> Set Target
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onManageException(row.plateNorm)}>
                        <CalendarClock className="text-indigo-500" /> Kelola Jadwal
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDriverHistory(row)}>
                        <History className="text-sky-500" /> Histori Driver
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>

                {days.map((d) => {
                  const cell = row.days[d];
                  const tone = cellTone(cell, row.dailyTarget);
                  const clickable = !!cell && toneClickable(tone);
                  const exc = cell?.exception;
                  const label = exc && (cell?.displayAmount ?? 0) === 0
                    ? exc.isBebasSetoran
                      ? 'Rental'
                      : (exc.keterangan ?? '').slice(0, 6)
                    : cell && cell.displayAmount > 0
                      ? nf(cell.displayAmount)
                      : '-';
                  return (
                    <td
                      key={d}
                      role={clickable ? 'button' : undefined}
                      aria-label={clickable ? `${row.plateRaw} tanggal ${d}: ${label}` : undefined}
                      className={cn(
                        'border-b border-r px-1 py-1 text-right tabular-nums',
                        toneClass(tone),
                        clickable && 'cursor-pointer hover:brightness-95',
                      )}
                      style={{ width: DAY_W }}
                      title={exc?.keterangan ?? undefined}
                      onClick={clickable ? () => onCellClick(row.plateNorm, d) : undefined}
                    >
                      {label}
                    </td>
                  );
                })}

                <td className="border-b border-l-2 border-l-slate-300 border-r bg-white px-2 py-1 text-right tabular-nums dark:bg-slate-950">
                  {rp(row.summary.totalDeduction)}
                </td>
                <td className="border-b border-r bg-white px-2 py-1 text-right tabular-nums dark:bg-slate-950">
                  {rp(row.summary.calculatedTarget)}
                </td>
                <td className={cn('border-b border-r bg-white px-2 py-1 text-right tabular-nums dark:bg-slate-950', gap < 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {nf(gap)}
                </td>
                <td className={cn('border-b border-r px-2 py-1 text-right font-semibold tabular-nums', outstanding > 0 ? 'bg-[#ffcccc] text-red-900' : outstanding < 0 ? 'bg-[#00ff00] text-slate-900' : 'bg-white dark:bg-slate-950')}>
                  {rp(outstanding)}
                </td>
              </tr>
            );
          })}
          {grid.rows.length === 0 && (
            <tr>
              <td colSpan={IDENTITY.length + days.length + SUMMARY.length} className="border-b px-3 py-10 text-center text-slate-500">
                Tidak ada data untuk periode / filter ini.
              </td>
            </tr>
          )}

          {grid.rows.length > 0 &&
            (() => {
              const totalGap = grid.tableTotals.totalDeduction - grid.tableTotals.totalDue;
              const totalOut = grid.tableTotals.outstanding;
              // sticky bottom applied per-cell (not on <tr>, which WebKit ignores)
              const foot = 'sticky bottom-0 border-b border-r bg-indigo-50 px-2 py-1.5 text-right tabular-nums dark:bg-indigo-950';
              return (
                <tr className="font-semibold">
                  <td
                    colSpan={IDENTITY.length}
                    className="sticky bottom-0 left-0 z-20 border-b border-r-2 border-r-slate-300 bg-indigo-50 px-2 py-1.5 text-right dark:bg-indigo-950"
                  >
                    TOTAL HARI INI
                  </td>
                  {days.map((d) => (
                    <td key={d} className={cn(foot, 'px-1')} style={{ width: DAY_W }}>
                      {grid.dailyTotals[d] > 0 ? nf(grid.dailyTotals[d]) : '-'}
                    </td>
                  ))}
                  <td className={cn(foot, 'border-l-2 border-l-slate-300')}>{rp(grid.tableTotals.totalDeduction)}</td>
                  <td className={foot}>{rp(grid.tableTotals.totalDue)}</td>
                  <td className={cn(foot, totalGap < 0 ? 'text-red-600' : 'text-emerald-600')}>{nf(totalGap)}</td>
                  <td
                    className={cn(
                      'sticky bottom-0 border-b border-r px-2 py-1.5 text-right tabular-nums',
                      totalOut > 0 ? 'bg-[#ffcccc] text-red-900' : totalOut < 0 ? 'bg-[#00ff00] text-slate-900' : 'bg-indigo-50 dark:bg-indigo-950',
                    )}
                  >
                    {rp(totalOut)}
                  </td>
                </tr>
              );
            })()}
        </tbody>
      </table>
    </div>
  );
}
