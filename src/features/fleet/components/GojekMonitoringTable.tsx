import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cellTone, toneClass, toneClickable } from '../lib/thresholds';
import { monthYearLabelID } from '@/lib/datetime';
import { formatNumberID, formatRupiah } from '@/lib/money';
import type { FleetGrid } from '../types';
import { groupRowSpans, identityWidth, stickyLefts, type IdentityCol } from './stickyGrid';

// Faithful port of the legacy Gojek pivot (_table.blade.php): two-row sticky
// blue header, frozen identity columns, rental-partner rowspan grouping,
// 8-tone day cells, Total Deduction / Due / Gap / Outstanding, and a TOTAL row.
// Rendered in the modern shadcn shell; horizontally scrollable on mobile.
//
// Two column layouts share this component:
//  • admin   → No · Rental Partner · Plate · Type · Driver · Setoran
//    (pure sync view of every partner's registered plates — the Rental
//    Partner label comes from the registering partner; no per-row actions)
//  • partner → No · Plate · Type · Driver · Setoran · Aksi
//    (own plates only; Aksi = Kelola Jadwal on the partner's own plates)
// Driver history is rendered inline as its own frozen column (one name per
// line), replacing the legacy "Histori Driver" modal.

const IDENTITY_ADMIN: IdentityCol[] = [
  { id: 'no', label: 'No', width: 44 },
  { id: 'rentalPartner', label: 'Rental Partner', width: 130 },
  { id: 'plate', label: 'Plate', width: 92 },
  { id: 'type', label: 'Type', width: 104 },
  { id: 'driver', label: 'Driver', width: 148 },
  { id: 'setoran', label: 'Setoran', width: 78 },
];
const IDENTITY_PARTNER: IdentityCol[] = [
  { id: 'no', label: 'No', width: 44 },
  { id: 'plate', label: 'Plate', width: 96 },
  { id: 'type', label: 'Type', width: 110 },
  { id: 'driver', label: 'Driver', width: 152 },
  { id: 'setoran', label: 'Setoran', width: 82 },
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
  // Partner-portal row action: Kelola Jadwal for the row's plate. The Aksi
  // column renders only in the partner layout (readOnly) when this is set.
  onManageException?: (plateNorm: string) => void;
  // readOnly = partner portal layout: drops the cross-partner Rental Partner
  // column and gains the own-plate Aksi column.
  readOnly?: boolean;
  // Surface-specific empty-state copy (e.g. the admin grid explains that only
  // partner-registered plates appear).
  emptyMessage?: string;
};

export function GojekMonitoringTable({
  grid,
  onCellClick,
  onManageException,
  readOnly = false,
  emptyMessage = 'Tidak ada data untuk periode / filter ini.',
}: Props) {
  const identity = useMemo(() => (readOnly ? IDENTITY_PARTNER : IDENTITY_ADMIN), [readOnly]);
  const lefts = useMemo(() => stickyLefts(identity), [identity]);
  const idW = useMemo(() => identityWidth(identity), [identity]);
  const rpSpans = useMemo(() => groupRowSpans(grid.rows, (r) => r.rentalPartner), [grid.rows]);
  const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);
  const monthLabel = monthYearLabelID(grid.month, grid.year);

  // Per-column sticky offset/width, driven by which identity columns are shown
  // (so partner vs admin layouts reindex correctly).
  const colAt = (id: IdentityCol['id']) => {
    const i = identity.findIndex((c) => c.id === id);
    if (i === -1) return null;
    return { left: lefts[i], width: identity[i].width, isLast: i === identity.length - 1 };
  };
  const stickyBase = 'sticky z-10 border-b bg-white group-hover:bg-slate-50 dark:bg-slate-950';
  const lastBorder = (isLast: boolean) => (isLast ? 'border-r-2 border-r-slate-300' : 'border-r');

  return (
    <div className="relative max-h-[78svh] overflow-auto rounded-lg border">
      <table className="border-separate border-spacing-0 text-xs" style={{ minWidth: idW + days.length * DAY_W + identityWidth(SUMMARY) }}>
        <thead>
          {/* Row 1: identity (rowspan 2) + Tanggal group + Summary group */}
          <tr>
            {identity.map((c, i) => (
              <th
                key={c.id}
                rowSpan={2}
                className={cn(
                  'sticky top-0 z-30 border-b border-r border-indigo-300/40 px-2 py-2 text-center font-semibold',
                  HEAD_BG,
                  i === identity.length - 1 && 'border-r-2 border-r-slate-300',
                )}
                style={{ left: lefts[i], width: c.width, minWidth: c.width }}
              >
                {c.label}
              </th>
            ))}
            <th
              colSpan={days.length}
              className={cn('sticky top-0 z-20 h-8 border-b border-r border-indigo-300/40 px-2 py-0 text-left align-middle font-semibold', HEAD_BG)}
            >
              {/* pinned past the frozen columns so the label stays visible
                  while the ~31-day band scrolls horizontally */}
              <span className="sticky inline-block w-fit" style={{ left: idW + 12 }}>
                Tanggal ({monthLabel})
              </span>
            </th>
            <th
              colSpan={SUMMARY.length}
              className={cn('sticky top-0 z-20 h-8 border-b border-l-2 border-l-slate-300 px-2 py-0 text-center align-middle font-semibold', SUMMARY_BG)}
            >
              Summary
            </th>
          </tr>
          {/* Row 2: day numbers + summary sub-headers */}
          <tr>
            {days.map((d) => (
              <th
                key={d}
                className={cn('sticky top-8 z-20 border-b border-r border-indigo-300/30 px-1 py-1 text-center font-medium', HEAD_BG)}
                style={{ width: DAY_W, minWidth: DAY_W }}
              >
                {d}
              </th>
            ))}
            {SUMMARY.map((c, i) => (
              <th
                key={c.id}
                className={cn(
                  'sticky top-8 z-20 border-b border-r px-1 py-1 text-center font-medium',
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
            const noCol = colAt('no')!;
            const rpCol = colAt('rentalPartner');
            const plateCol = colAt('plate')!;
            const typeCol = colAt('type')!;
            const driverCol = colAt('driver')!;
            const setoranCol = colAt('setoran')!;
            const aksiCol = colAt('aksi');
            return (
              <tr key={row.plateNorm} className="group">
                <td
                  className={cn(stickyBase, 'px-2 py-1 text-center text-slate-500', lastBorder(noCol.isLast))}
                  style={{ left: noCol.left, width: noCol.width }}
                >
                  {idx + 1}
                </td>
                {rpCol && rpSpans[idx] !== undefined && (
                  <td
                    rowSpan={rpSpans[idx]}
                    className="sticky z-10 border-b border-r bg-slate-50 px-2 py-1 text-center align-middle font-semibold dark:bg-slate-900"
                    style={{ left: rpCol.left, width: rpCol.width }}
                  >
                    {row.rentalPartner || '-'}
                  </td>
                )}
                <td
                  className={cn(stickyBase, 'truncate px-2 py-1 text-center font-semibold', lastBorder(plateCol.isLast))}
                  style={{ left: plateCol.left, width: plateCol.width, maxWidth: plateCol.width }}
                  title={row.detailId !== null ? 'Manual Payment tanpa plat' : row.plateRaw}
                >
                  {row.detailId !== null ? (
                    <span className="rounded bg-[#9c27b0]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#9c27b0] dark:bg-[#9c27b0]/25 dark:text-purple-300">
                      Tanpa Plat
                    </span>
                  ) : (
                    row.plateRaw
                  )}
                </td>
                <td
                  className={cn(stickyBase, 'truncate px-2 py-1 text-center text-slate-600 dark:text-slate-300', lastBorder(typeCol.isLast))}
                  style={{ left: typeCol.left, width: typeCol.width, maxWidth: typeCol.width }}
                  title={row.vehicleType}
                >
                  {row.vehicleType || '-'}
                </td>
                <td
                  className={cn(stickyBase, 'px-2 py-1 text-left', lastBorder(driverCol.isLast))}
                  style={{ left: driverCol.left, width: driverCol.width, maxWidth: driverCol.width }}
                >
                  {row.driverHistory.length > 0 ? (
                    <div className="space-y-0.5">
                      {row.driverHistory.map((name, i) => (
                        <div key={`${name}-${i}`} className="truncate" title={name}>
                          {name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td
                  className={cn(stickyBase, 'px-2 py-1 text-right tabular-nums', lastBorder(setoranCol.isLast))}
                  style={{ left: setoranCol.left, width: setoranCol.width }}
                >
                  {nf(row.dailyTarget)}
                </td>
                {aksiCol && (
                  <td
                    className={cn(stickyBase, 'px-1 py-1 text-center', lastBorder(aksiCol.isLast))}
                    style={{ left: aksiCol.left, width: aksiCol.width }}
                  >
                    {onManageException && row.plateRaw !== '' && (
                      <button
                        type="button"
                        aria-label={`Kelola jadwal ${row.plateRaw}`}
                        title="Kelola Jadwal"
                        onClick={() => onManageException(row.plateNorm)}
                        className="inline-flex size-6 items-center justify-center rounded text-indigo-500 hover:bg-slate-200 hover:text-indigo-700 dark:hover:bg-slate-800"
                      >
                        <CalendarClock className="size-4" />
                      </button>
                    )}
                  </td>
                )}

                {days.map((d) => {
                  const cell = row.days[d];
                  const tone = cellTone(cell, row.dailyTarget);
                  const clickable = !!cell && toneClickable(tone);
                  const exc = cell?.exception;
                  // In-data-but-Rp0 (pink) shows an explicit "0"; only days with
                  // no import data at all render the "-" placeholder.
                  const label = exc && (cell?.displayAmount ?? 0) === 0
                    ? exc.isBebasSetoran
                      ? 'Rental'
                      : (exc.keterangan ?? '').slice(0, 6)
                    : cell
                      ? cell.displayAmount > 0
                        ? nf(cell.displayAmount)
                        : '0'
                      : '-';
                  return (
                    <td
                      key={d}
                      role={clickable ? 'button' : undefined}
                      aria-label={clickable ? `${row.plateRaw || 'Tanpa Plat'} tanggal ${d}: ${label}` : undefined}
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
              <td colSpan={identity.length + days.length + SUMMARY.length} className="border-b px-3 py-10 text-slate-500">
                {/* sticky: keeps the message inside the visible viewport of the
                    horizontally scrollable pivot instead of centering it across
                    the full ~3000px table width */}
                <div className="sticky left-3 w-fit max-w-[calc(100%-1.5rem)]">{emptyMessage}</div>
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
                    colSpan={identity.length}
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
