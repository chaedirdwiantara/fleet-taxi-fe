import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { cellTone, toneClass, toneClickable } from '../lib/thresholds';
import { formatDateID, monthYearLabelID } from '@/lib/datetime';
import { formatNumberID, formatRupiah } from '@/lib/money';
import type { MonitoringMode } from '../searchSchema';
import type { FleetGrid, FleetRow } from '../types';
import {
  frozenPrefixCount,
  frozenWidth,
  groupRowSpans,
  identityWidth,
  stickyLefts,
  type IdentityCol,
} from './stickyGrid';

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
//
// `mode: 'driver'` mirrors those layouts around the subject: the row becomes a
// person, so Driver moves into the identity slot and the Plate column lists the
// plates they drove. Plate-level affordances (Aksi = Kelola Jadwal, the "Baru"
// badge) are dropped — they act on a vehicle, not on a person.

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
// Driver mode lists "PLAT - Tipe" per line, so the Plat column is wider than
// its plate-mode twin — affordable now that it scrolls instead of being pinned.
const IDENTITY_ADMIN_DRIVER: IdentityCol[] = [
  { id: 'no', label: 'No', width: 44 },
  { id: 'rentalPartner', label: 'Rental Partner', width: 130 },
  { id: 'driver', label: 'Driver', width: 160 },
  { id: 'plate', label: 'Plat', width: 208 },
  { id: 'setoran', label: 'Setoran', width: 78 },
];
const IDENTITY_PARTNER_DRIVER: IdentityCol[] = [
  { id: 'no', label: 'No', width: 44 },
  { id: 'driver', label: 'Driver', width: 168 },
  { id: 'plate', label: 'Plat', width: 214 },
  { id: 'setoran', label: 'Setoran', width: 82 },
];
const DAY_W = 62;
const SUMMARY: IdentityCol[] = [
  { id: 'totalDeduction', label: 'Total Deduction', width: 128 },
  { id: 'totalDue', label: 'Total Due (Target)', width: 128 },
  { id: 'gap', label: 'Gap', width: 104 },
  // Bln Ini = the selected month's own delta; Total = accumulated from the
  // plate's first imported month up to (and including) the selected month.
  { id: 'outstandingMonth', label: 'Outstanding Bln Ini', width: 132 },
  { id: 'outstanding', label: 'Outstanding Total', width: 132 },
];

const HEAD_BG = 'bg-primary text-primary-foreground';
const SUMMARY_BG = 'bg-green-600 text-white';
const nf = formatNumberID;
const rp = formatRupiah;

// Same sky tint the driver/rental badges use for "in progress" states
// (features/partner/driver/components/StatusBadge.tsx).
const NEW_JOINER_TINT =
  'border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400';

// Total Due is the sum of the days that were actually billed, so the cell says
// which days those were. A backend that predates the fields renders no caption
// rather than a wrong one.
function billedSpan(row: FleetRow): { caption: string | null; title: string | undefined } {
  const { billedDays, billFromDay, billToDay } = row.summary;
  if (billedDays === undefined) return { caption: null, title: undefined };
  if (billedDays === 0) {
    return {
      caption: 'Belum ada tagihan',
      title: 'Belum ada baris due yang terimpor untuk periode ini.',
    };
  }
  const span =
    billFromDay != null && billToDay != null && billFromDay !== billToDay
      ? `${billFromDay}–${billToDay}`
      : `${billFromDay}`;
  return {
    caption: `${span} · ${billedDays} hari`,
    title: `Total dari ${billedDays} hari yang ditagih (tgl ${span}). Hari tanpa baris due — belum berjalan, belum diimpor, atau bebas setoran — tidak ditagih.`,
  };
}

type Props = {
  grid: FleetGrid;
  onCellClick: (plateNorm: string, day: number) => void;
  // Partner-portal row action: Kelola Jadwal for the row's plate. The Aksi
  // column renders only in the partner layout (readOnly) when this is set.
  onManageException?: (plateNorm: string) => void;
  // readOnly = partner portal layout: drops the cross-partner Rental Partner
  // column and gains the own-plate Aksi column.
  readOnly?: boolean;
  // Row subject. Defaults to the plate view; 'driver' swaps the identity columns
  // (and comes from the backend already grouped that way).
  mode?: MonitoringMode;
  // Surface-specific empty-state copy (e.g. the admin grid explains that only
  // partner-registered plates appear).
  emptyMessage?: string;
};

export function GojekMonitoringTable({
  grid,
  onCellClick,
  onManageException,
  readOnly = false,
  mode = 'plate',
  emptyMessage = 'Tidak ada data untuk periode / filter ini.',
}: Props) {
  const byDriver = mode === 'driver';
  const identity = useMemo(
    () =>
      byDriver
        ? readOnly
          ? IDENTITY_PARTNER_DRIVER
          : IDENTITY_ADMIN_DRIVER
        : readOnly
          ? IDENTITY_PARTNER
          : IDENTITY_ADMIN,
    [byDriver, readOnly],
  );
  // Pin No + the row's subject only; Type/Driver/Setoran/Aksi scroll with the
  // day band so far more of the month fits on screen (and on a phone at all).
  const frozenCount = useMemo(
    () => frozenPrefixCount(identity, byDriver ? 'driver' : 'plate'),
    [identity, byDriver],
  );
  const lefts = useMemo(() => stickyLefts(identity, frozenCount), [identity, frozenCount]);
  const idW = useMemo(() => identityWidth(identity), [identity]);
  const frozenW = useMemo(() => frozenWidth(identity, frozenCount), [identity, frozenCount]);
  // Per-plate Type, for the "B2449SNC - BYD M6" lines the driver view renders.
  const typeByPlate = useMemo(
    () => new Map(grid.availablePlates.map((p) => [p.plate, p.type])),
    [grid.availablePlates],
  );
  const plateLabel = (plate: string) => {
    const type = typeByPlate.get(plate);
    return type ? `${plate} - ${type}` : plate;
  };
  const rpSpans = useMemo(() => groupRowSpans(grid.rows, (r) => r.rentalPartner), [grid.rows]);
  const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);
  const monthLabel = monthYearLabelID(grid.month, grid.year);

  // Sticky offsets come from the identity array itself, so the partner/admin ×
  // plate/driver layouts all reindex without any per-column bookkeeping.
  const cellBase = (left?: number) =>
    cn(
      left !== undefined && 'sticky z-10',
      'border-b bg-white group-hover:bg-slate-50 dark:bg-slate-950',
    );
  // Heavier rule where the pinned block ends, so the reader can see what stays.
  const lastBorder = (isLast: boolean, isLastFrozen: boolean) =>
    isLast || isLastFrozen ? 'border-r-2 border-r-slate-300' : 'border-r';

  return (
    <div className="relative scrollbar-slim max-h-[78svh] overflow-auto rounded-lg border">
      <table
        className="border-separate border-spacing-0 text-xs"
        style={{ minWidth: idW + days.length * DAY_W + identityWidth(SUMMARY) }}
      >
        <thead>
          {/* Row 1: identity (rowspan 2) + Tanggal group + Summary group */}
          <tr>
            {identity.map((c, i) => (
              <th
                key={c.id}
                rowSpan={2}
                className={cn(
                  // every identity header stays sticky VERTICALLY; only the
                  // frozen prefix also pins horizontally (and outranks the days)
                  'sticky top-0 border-b border-indigo-300/40 px-2 py-2 text-center font-semibold',
                  lefts[i] !== undefined ? 'z-30' : 'z-20',
                  HEAD_BG,
                  lastBorder(i === identity.length - 1, i === frozenCount - 1),
                )}
                style={{ left: lefts[i], width: c.width, minWidth: c.width }}
              >
                {c.label}
              </th>
            ))}
            <th
              colSpan={days.length}
              className={cn(
                'sticky top-0 z-20 h-8 border-r border-b border-indigo-300/40 px-2 py-0 text-left align-middle font-semibold',
                HEAD_BG,
              )}
            >
              {/* pinned past the frozen columns so the label stays visible
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
              Summary
            </th>
          </tr>
          {/* Row 2: day numbers + summary sub-headers */}
          <tr>
            {days.map((d) => (
              <th
                key={d}
                className={cn(
                  'sticky top-8 z-20 border-r border-b border-indigo-300/30 px-1 py-1 text-center font-medium',
                  HEAD_BG,
                )}
                style={{ width: DAY_W, minWidth: DAY_W }}
              >
                {d}
              </th>
            ))}
            {SUMMARY.map((c, i) => (
              <th
                key={c.id}
                className={cn(
                  'sticky top-8 z-20 border-r border-b px-1 py-1 text-center font-medium',
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
            const billed = billedSpan(row);
            const outstanding = row.summary.outstanding;
            const outstandingMonth = row.summary.outstandingMonth ?? 0;
            return (
              <tr key={row.plateNorm} className="group">
                {/* Identity cells are emitted in `identity` order, so the header
                    and the body can never disagree about which column is which
                    (the two layouts × two modes reorder them). */}
                {identity.map((col, colIdx) => {
                  const pos = { left: lefts[colIdx], width: col.width };
                  const base = cn(
                    cellBase(pos.left),
                    lastBorder(colIdx === identity.length - 1, colIdx === frozenCount - 1),
                  );

                  switch (col.id) {
                    case 'no':
                      return (
                        <td
                          key={col.id}
                          className={cn(base, 'px-2 py-1 text-center text-slate-500')}
                          style={{ left: pos.left, width: pos.width }}
                        >
                          {idx + 1}
                        </td>
                      );

                    case 'rentalPartner':
                      // merged run of rows sharing one partner (legacy rowspan)
                      return rpSpans[idx] === undefined ? null : (
                        <td
                          key={col.id}
                          rowSpan={rpSpans[idx]}
                          className={cn(
                            pos.left !== undefined && 'sticky z-10',
                            'border-r border-b bg-slate-50 px-2 py-1 text-center align-middle font-semibold dark:bg-slate-900',
                          )}
                          style={{ left: pos.left, width: pos.width }}
                        >
                          {row.rentalPartner || '-'}
                        </td>
                      );

                    case 'plate':
                      return (
                        <td
                          key={col.id}
                          className={cn(
                            base,
                            'px-2 py-1 text-center font-semibold',
                            !byDriver && 'truncate',
                          )}
                          style={{ left: pos.left, width: pos.width, maxWidth: pos.width }}
                          title={
                            byDriver
                              ? (row.plateHistory ?? []).map(plateLabel).join(', ')
                              : row.detailId !== null
                                ? 'Manual Payment tanpa plat'
                                : row.plateRaw
                          }
                        >
                          {byDriver ? (
                            // Mirror of the Driver column: every plate this person
                            // drove this month, one per line — each with its
                            // vehicle type, which plate mode shows in its own
                            // column but a driver row has no single value for.
                            (row.plateHistory ?? []).length > 0 ? (
                              <div className="space-y-0.5">
                                {(row.plateHistory ?? []).map((plate) => (
                                  <div key={plate} className="truncate" title={plateLabel(plate)}>
                                    {plate}
                                    {typeByPlate.get(plate) && (
                                      <span className="font-normal text-slate-500 dark:text-slate-400">
                                        {' '}
                                        - {typeByPlate.get(plate)}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="font-normal text-slate-400">-</span>
                            )
                          ) : row.detailId !== null ? (
                            <span className="rounded bg-purple-600/15 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-600/25 dark:text-purple-300">
                              Tanpa Plat
                            </span>
                          ) : (
                            row.plateRaw
                          )}
                          {/* "Baru" is a plate lifecycle fact → plate view only */}
                          {!byDriver && row.isNewJoiner && (
                            <Badge
                              className={cn(NEW_JOINER_TINT, 'mt-0.5 flex')}
                              title={
                                row.joinDate
                                  ? `Plat baru — data pertama masuk ${formatDateID(row.joinDate)}. Target hanya dihitung sejak tanggal itu.`
                                  : 'Plat baru bulan ini — target hanya dihitung sejak data pertama.'
                              }
                            >
                              Baru
                            </Badge>
                          )}
                        </td>
                      );

                    case 'type':
                      return (
                        <td
                          key={col.id}
                          className={cn(
                            base,
                            'truncate px-2 py-1 text-center text-slate-600 dark:text-slate-300',
                          )}
                          style={{ left: pos.left, width: pos.width, maxWidth: pos.width }}
                          title={row.vehicleType}
                        >
                          {row.vehicleType || '-'}
                        </td>
                      );

                    case 'driver':
                      return (
                        <td
                          key={col.id}
                          className={cn(base, 'px-2 py-1 text-left')}
                          style={{ left: pos.left, width: pos.width, maxWidth: pos.width }}
                        >
                          {/* In driver mode the row IS one person, so the column
                              shows that name; in plate mode it lists everyone who
                              drove the plate. */}
                          {(byDriver ? [row.driverName].filter(Boolean) : row.driverHistory)
                            .length > 0 ? (
                            <div className="space-y-0.5">
                              {(byDriver ? [row.driverName] : row.driverHistory).map((name, i) => (
                                <div
                                  key={`${name}-${i}`}
                                  className={cn('truncate', byDriver && 'font-semibold')}
                                  title={name}
                                >
                                  {name}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              {byDriver ? 'Tanpa nama driver' : '-'}
                            </span>
                          )}
                          {row.isExited && (
                            <span
                              className="mt-0.5 inline-flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white"
                              title={
                                row.exitedLastSeen
                                  ? `Driver keluar — terakhir muncul di import: ${formatDateID(row.exitedLastSeen)}`
                                  : 'Driver keluar'
                              }
                            >
                              Keluar
                              {row.exitedLastSeen && (
                                <span className="font-normal opacity-90">
                                  · {formatDateID(row.exitedLastSeen)}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                      );

                    case 'setoran':
                      return (
                        <td
                          key={col.id}
                          className={cn(base, 'px-2 py-1 text-right tabular-nums')}
                          style={{ left: pos.left, width: pos.width }}
                        >
                          {/* target changed mid-month → list every value with its
                              active day range (legacy due_segments) */}
                          {(row.dueSegments?.length ?? 0) > 1 ? (
                            <div className="space-y-0.5">
                              {(row.dueSegments ?? []).map((seg) => (
                                <div
                                  key={`${seg.amount}-${seg.fromDay}`}
                                  className="whitespace-nowrap"
                                >
                                  {nf(seg.amount)}{' '}
                                  <span className="text-xs text-slate-400">
                                    ({seg.fromDay}
                                    {seg.toDay !== seg.fromDay ? `–${seg.toDay}` : ''})
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            nf(row.dailyTarget)
                          )}
                        </td>
                      );

                    case 'aksi':
                      return (
                        <td
                          key={col.id}
                          className={cn(base, 'px-1 py-1 text-center')}
                          style={{ left: pos.left, width: pos.width }}
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
                      );

                    default:
                      return null;
                  }
                })}

                {days.map((d) => {
                  const cell = row.days[d];
                  // per-day baseline: that day's own due amount when the target
                  // changed mid-month, else the single monthly target
                  const tone = cellTone(cell, row.dailyDue?.[d] ?? row.dailyTarget);
                  const clickable = !!cell && toneClickable(tone);
                  const exc = cell?.exception;
                  // In-data-but-Rp0 (pink) shows an explicit "0"; only days with
                  // no import data at all render the "-" placeholder.
                  const label =
                    exc && (cell?.displayAmount ?? 0) === 0
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
                      aria-label={
                        clickable
                          ? `${row.plateRaw || 'Tanpa Plat'} tanggal ${d}: ${label}`
                          : undefined
                      }
                      className={cn(
                        'border-r border-b px-1 py-1 text-right tabular-nums',
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

                <td className="border-r border-b border-l-2 border-l-slate-300 bg-white px-2 py-1 text-right tabular-nums dark:bg-slate-950">
                  {rp(row.summary.totalDeduction)}
                </td>
                <td
                  className="border-r border-b bg-white px-2 py-1 text-right tabular-nums dark:bg-slate-950"
                  title={billed.title}
                >
                  {rp(row.summary.calculatedTarget)}
                  {billed.caption && (
                    <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                      {billed.caption}
                    </span>
                  )}
                </td>
                <td
                  className={cn(
                    'border-r border-b bg-white px-2 py-1 text-right tabular-nums dark:bg-slate-950',
                    gap < 0 ? 'text-red-600' : 'text-emerald-600',
                  )}
                >
                  {nf(gap)}
                </td>
                {/* + merah = outstanding bulan ini nambah; − hijau = berkurang
                    (overpayment bulan ini menurunkan saldo kumulatif) */}
                <td
                  className={cn(
                    'border-r border-b bg-white px-2 py-1 text-right tabular-nums dark:bg-slate-950',
                    outstandingMonth > 0
                      ? 'text-red-600'
                      : outstandingMonth < 0
                        ? 'text-emerald-600'
                        : undefined,
                  )}
                >
                  {outstandingMonth > 0 ? `+${nf(outstandingMonth)}` : nf(outstandingMonth)}
                </td>
                <td
                  className={cn(
                    'border-r border-b px-2 py-1 text-right font-semibold tabular-nums',
                    outstanding > 0
                      ? 'bg-red-200 text-red-900'
                      : outstanding < 0
                        ? 'bg-green-400 text-slate-900'
                        : 'bg-white dark:bg-slate-950',
                  )}
                >
                  {rp(outstanding)}
                </td>
              </tr>
            );
          })}
          {grid.rows.length === 0 && (
            <tr>
              <td
                colSpan={identity.length + days.length + SUMMARY.length}
                className="border-b px-3 py-10 text-slate-500"
              >
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
              const totalOutMonth = grid.tableTotals.outstandingMonth ?? 0;
              // sticky bottom applied per-cell (not on <tr>, which WebKit ignores)
              const foot =
                'sticky bottom-0 border-b border-r bg-indigo-50 px-2 py-1.5 text-right tabular-nums dark:bg-indigo-950';
              return (
                <tr className="font-semibold">
                  {/* Split at the frozen boundary: one cell spanning the whole
                      identity block would be pinned as a whole and would cover
                      the day columns as soon as the reader scrolls. */}
                  <td
                    colSpan={frozenCount}
                    className="sticky bottom-0 left-0 z-20 border-r-2 border-b border-r-slate-300 bg-indigo-50 px-2 py-1.5 text-right whitespace-nowrap dark:bg-indigo-950"
                  >
                    TOTAL HARI INI
                  </td>
                  {frozenCount < identity.length && (
                    <td
                      colSpan={identity.length - frozenCount}
                      className="sticky bottom-0 border-r-2 border-b border-r-slate-300 bg-indigo-50 dark:bg-indigo-950"
                    />
                  )}
                  {days.map((d) => (
                    <td key={d} className={cn(foot, 'px-1')} style={{ width: DAY_W }}>
                      {grid.dailyTotals[d] > 0 ? nf(grid.dailyTotals[d]) : '-'}
                    </td>
                  ))}
                  <td className={cn(foot, 'border-l-2 border-l-slate-300')}>
                    {rp(grid.tableTotals.totalDeduction)}
                  </td>
                  <td className={foot}>{rp(grid.tableTotals.totalDue)}</td>
                  <td className={cn(foot, totalGap < 0 ? 'text-red-600' : 'text-emerald-600')}>
                    {nf(totalGap)}
                  </td>
                  <td
                    className={cn(
                      foot,
                      totalOutMonth > 0
                        ? 'text-red-600'
                        : totalOutMonth < 0
                          ? 'text-emerald-600'
                          : undefined,
                    )}
                  >
                    {totalOutMonth > 0 ? `+${nf(totalOutMonth)}` : nf(totalOutMonth)}
                  </td>
                  <td
                    className={cn(
                      'sticky bottom-0 border-r border-b px-2 py-1.5 text-right tabular-nums',
                      totalOut > 0
                        ? 'bg-red-200 text-red-900'
                        : totalOut < 0
                          ? 'bg-green-400 text-slate-900'
                          : 'bg-indigo-50 dark:bg-indigo-950',
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
