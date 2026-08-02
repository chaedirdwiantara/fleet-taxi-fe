import { useMemo } from 'react';
import { Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { monthYearLabelID } from '@/lib/datetime';
import { formatNumberID, formatRupiah } from '@/lib/money';
import {
  frozenPrefixCount,
  frozenWidth,
  groupRowSpans,
  identityWidth,
  stickyLefts,
  type IdentityCol,
} from '@/features/fleet/components/stickyGrid';
import type { MonitoringMode } from '@/features/fleet/searchSchema';
import type { GrabGrid, GrabRow } from './types';

// Faithful port of the legacy Grab pivot: rental-partner + city rowspan
// grouping, frozen identity columns, green earning cells, and the monthly
// summary block. Driver "eye" opens the performance modal; pencil edits.
//
// `mode: 'driver'` merges a person's rows across plates and cities (the backend
// does the grouping), so the identity block collapses to Driver + the plates
// they drove; the city/model/plate columns are per-vehicle and move into that
// list.

const IDENTITY: IdentityCol[] = [
  { id: 'no', label: 'No', width: 44 },
  { id: 'rentalPartner', label: 'Rental Partner', width: 120 },
  { id: 'city', label: 'City', width: 88 },
  { id: 'plate', label: 'Plate', width: 100 },
  { id: 'model', label: 'Car Model', width: 130 },
  { id: 'driver', label: 'Driver Name', width: 160 },
  { id: 'tiering', label: 'Tiering', width: 92 },
  { id: 'action', label: 'Action', width: 56 },
];
const IDENTITY_DRIVER: IdentityCol[] = [
  { id: 'no', label: 'No', width: 44 },
  { id: 'rentalPartner', label: 'Rental Partner', width: 120 },
  { id: 'driver', label: 'Driver Name', width: 168 },
  // lists "PLAT - Model · Kota" per line; wider now that the column scrolls
  { id: 'plate', label: 'Plat · Kota', width: 210 },
  { id: 'tiering', label: 'Tiering', width: 92 },
];
const DAY_W = 74;
const SUMMARY: IdentityCol[] = [
  { id: 'earning', label: 'Total Earning', width: 132 },
  { id: 'incentive', label: 'Total Incentive', width: 122 },
  { id: 'fare', label: 'Total Fare', width: 122 },
  { id: 'rides', label: 'Total Rides', width: 96 },
];

const HEAD_BG = 'bg-primary text-primary-foreground';
const SUMMARY_BG = 'bg-green-600 text-white';
const nf = formatNumberID;
const rp = formatRupiah;

export function GrabMonitoringTable({
  grid,
  onDriverDetail,
  onEditDriver,
  readOnly = false,
  mode = 'plate',
}: {
  grid: GrabGrid;
  onDriverDetail: (compositeKey: string) => void;
  onEditDriver?: (row: GrabRow) => void;
  // Read-only mode hides the edit "Action" column (the eye/detail stays).
  readOnly?: boolean;
  // Row subject; 'driver' expects a grid the backend already grouped per person.
  mode?: MonitoringMode;
}) {
  const byDriver = mode === 'driver';
  // Partner (readOnly) drops both the edit Action AND the cross-partner
  // "Rental Partner" column (a partner only ever sees its own plates).
  const identity = useMemo(() => {
    const columns = byDriver ? IDENTITY_DRIVER : IDENTITY;
    return readOnly
      ? columns.filter((c) => c.id !== 'action' && c.id !== 'rentalPartner')
      : columns;
  }, [byDriver, readOnly]);
  // Pin No … up to the row's subject only (its plate, or the driver); the
  // remaining attribute columns scroll with the day band so more days fit.
  const frozenCount = useMemo(
    () => frozenPrefixCount(identity, byDriver ? 'driver' : 'plate'),
    [identity, byDriver],
  );
  const lefts = useMemo(() => stickyLefts(identity, frozenCount), [identity, frozenCount]);
  const idW = useMemo(() => identityWidth(identity), [identity]);
  const frozenW = useMemo(() => frozenWidth(identity, frozenCount), [identity, frozenCount]);
  const rpSpans = useMemo(() => groupRowSpans(grid.rows, (r) => r.rentalPartner), [grid.rows]);
  const citySpans = useMemo(
    () => groupRowSpans(grid.rows, (r) => `${r.rentalPartner}|${r.city}`),
    [grid.rows],
  );
  const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);
  const monthLabel = monthYearLabelID(grid.month, grid.year);

  // Heavier rule where the pinned block ends, so the reader can see what stays.
  const lastBorder = (isLast: boolean, isLastFrozen: boolean) =>
    isLast || isLastFrozen ? 'border-r-2 border-r-slate-300' : 'border-r';
  const cellBase = (left?: number) =>
    cn(
      left !== undefined && 'sticky z-10',
      'border-b bg-white group-hover:bg-slate-50 dark:bg-slate-950',
    );

  return (
    <div className="relative scrollbar-slim max-h-[78svh] overflow-auto rounded-lg border">
      <table
        className="border-separate border-spacing-0 text-xs"
        style={{ minWidth: idW + days.length * DAY_W + identityWidth(SUMMARY) }}
      >
        <thead>
          <tr>
            {identity.map((c, i) => (
              <th
                key={c.id}
                rowSpan={2}
                className={cn(
                  // vertical stickiness for all; horizontal only for the pinned
                  // prefix, which then has to outrank the scrolling day headers
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
                'sticky top-0 z-20 h-8 border-r border-b px-2 py-0 text-left align-middle font-semibold',
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
              Monthly Summary
            </th>
          </tr>
          <tr>
            {days.map((d) => (
              <th
                key={d}
                className={cn(
                  'sticky top-8 z-20 border-r border-b px-1 py-1 text-center font-medium',
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
            return (
              <tr key={row.compositeKey} className="group">
                {/* Emitted in `identity` order so header and body always agree
                    across the admin/partner × plate/driver layouts. */}
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

                    case 'city':
                      return citySpans[idx] === undefined ? null : (
                        <td
                          key={col.id}
                          rowSpan={citySpans[idx]}
                          className={cn(
                            pos.left !== undefined && 'sticky z-10',
                            'border-r border-b bg-slate-50/70 px-2 py-1 text-center align-middle dark:bg-slate-900/70',
                          )}
                          style={{ left: pos.left, width: pos.width }}
                        >
                          {row.city}
                        </td>
                      );

                    case 'plate':
                      return (
                        <td
                          key={col.id}
                          className={cn(base, 'px-2 py-1 text-center font-semibold')}
                          style={{ left: pos.left, width: pos.width, maxWidth: pos.width }}
                        >
                          {byDriver ? (
                            // Mirror of the plate view's driver column: every
                            // vehicle this person drove, with the city.
                            (row.plateHistory ?? []).length > 0 ? (
                              <div className="space-y-0.5">
                                {(row.plateHistory ?? []).map((use) => (
                                  <div
                                    key={`${use.plate}|${use.city}`}
                                    className="truncate"
                                    title={[
                                      use.type ? `${use.plate} - ${use.type}` : use.plate,
                                      use.city,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  >
                                    {use.plate}
                                    {/* the Car Model plate mode shows in its own
                                        column — a driver row has no single one */}
                                    {use.type && (
                                      <span className="font-normal text-slate-500 dark:text-slate-400">
                                        {' '}
                                        - {use.type}
                                      </span>
                                    )}
                                    {use.city && (
                                      <span className="font-normal text-slate-400">
                                        {' '}
                                        · {use.city}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="font-normal text-slate-400">-</span>
                            )
                          ) : (
                            row.plateNumber
                          )}
                        </td>
                      );

                    case 'model':
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
                          {row.vehicleType}
                        </td>
                      );

                    case 'driver':
                      return (
                        <td
                          key={col.id}
                          className={cn(base, 'px-2 py-1 text-left')}
                          style={{ left: pos.left, width: pos.width, maxWidth: pos.width }}
                        >
                          <span className="flex items-center gap-1">
                            <span className="truncate font-semibold">
                              {row.driverName || 'Tanpa nama driver'}
                            </span>
                            <button
                              type="button"
                              aria-label={`Detail ${row.driverName}`}
                              onClick={() => onDriverDetail(row.compositeKey)}
                              className="shrink-0 text-indigo-500 hover:text-indigo-700"
                            >
                              <Eye className="size-3.5" />
                            </button>
                          </span>
                        </td>
                      );

                    case 'tiering':
                      return (
                        <td
                          key={col.id}
                          className={cn(base, 'px-2 py-1 text-center')}
                          style={{ left: pos.left, width: pos.width }}
                        >
                          <Badge variant={row.tiering === 'JAWARA' ? 'default' : 'secondary'}>
                            {row.tiering}
                          </Badge>
                        </td>
                      );

                    case 'action':
                      return (
                        <td
                          key={col.id}
                          className={cn(base, 'px-1 py-1 text-center')}
                          style={{ left: pos.left, width: pos.width }}
                        >
                          <button
                            type="button"
                            aria-label={`Edit ${row.plateNumber}`}
                            onClick={() => onEditDriver?.(row)}
                            className="inline-flex size-6 items-center justify-center rounded text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </td>
                      );

                    default:
                      return null;
                  }
                })}

                {days.map((d) => {
                  const val = row.days[d]?.earning ?? 0;
                  return (
                    <td
                      key={d}
                      className={cn(
                        'border-r border-b px-1 py-1 text-right tabular-nums',
                        val > 0
                          ? 'bg-green-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                          : 'bg-white text-slate-400 dark:bg-slate-950',
                      )}
                      style={{ width: DAY_W }}
                      title={val > 0 ? rp(val) : undefined}
                    >
                      {val > 0 ? nf(val) : '-'}
                    </td>
                  );
                })}

                <td className="border-r border-b border-l-2 border-l-slate-300 bg-emerald-50/60 px-2 py-1 text-right font-semibold tabular-nums dark:bg-emerald-950/40">
                  {rp(row.summary.earning)}
                </td>
                <td className="border-r border-b bg-emerald-50/60 px-2 py-1 text-right tabular-nums dark:bg-emerald-950/40">
                  {rp(row.summary.incentive)}
                </td>
                <td className="border-r border-b bg-emerald-50/60 px-2 py-1 text-right tabular-nums dark:bg-emerald-950/40">
                  {rp(row.summary.driverFare)}
                </td>
                <td className="border-r border-b bg-emerald-50/60 px-2 py-1 text-right tabular-nums dark:bg-emerald-950/40">
                  {nf(row.summary.rides)}
                </td>
              </tr>
            );
          })}
          {grid.rows.length === 0 && (
            <tr>
              <td
                colSpan={identity.length + days.length + SUMMARY.length}
                className="border-b px-3 py-10 text-center text-slate-500"
              >
                Tidak ada data untuk periode / filter ini.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
