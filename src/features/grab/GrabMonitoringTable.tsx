import { useMemo } from 'react';
import { Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { monthYearLabelID } from '@/lib/datetime';
import { formatNumberID, formatRupiah } from '@/lib/money';
import {
  groupRowSpans,
  identityWidth,
  stickyLefts,
  type IdentityCol,
} from '@/features/fleet/components/stickyGrid';
import type { GrabGrid, GrabRow } from './types';

// Faithful port of the legacy Grab pivot: rental-partner + city rowspan
// grouping, frozen identity columns, green earning cells, and the monthly
// summary block. Driver "eye" opens the performance modal; pencil edits.

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
const DAY_W = 74;
const SUMMARY: IdentityCol[] = [
  { id: 'earning', label: 'Total Earning', width: 132 },
  { id: 'incentive', label: 'Total Incentive', width: 122 },
  { id: 'fare', label: 'Total Fare', width: 122 },
  { id: 'rides', label: 'Total Rides', width: 96 },
];

const HEAD_BG = 'bg-[#3f51b5] text-white';
const SUMMARY_BG = 'bg-[#4CAF50] text-white';
const nf = formatNumberID;
const rp = formatRupiah;

export function GrabMonitoringTable({
  grid,
  onDriverDetail,
  onEditDriver,
  readOnly = false,
}: {
  grid: GrabGrid;
  onDriverDetail: (compositeKey: string) => void;
  onEditDriver?: (row: GrabRow) => void;
  // Read-only mode hides the edit "Action" column (the eye/detail stays).
  readOnly?: boolean;
}) {
  // Partner (readOnly) drops both the edit Action AND the cross-partner
  // "Rental Partner" column (a partner only ever sees its own plates).
  const identity = useMemo(
    () =>
      readOnly ? IDENTITY.filter((c) => c.id !== 'action' && c.id !== 'rentalPartner') : IDENTITY,
    [readOnly],
  );
  const lefts = useMemo(() => stickyLefts(identity), [identity]);
  const idW = useMemo(() => identityWidth(identity), [identity]);
  const rpSpans = useMemo(() => groupRowSpans(grid.rows, (r) => r.rentalPartner), [grid.rows]);
  const citySpans = useMemo(
    () => groupRowSpans(grid.rows, (r) => `${r.rentalPartner}|${r.city}`),
    [grid.rows],
  );
  const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);
  const monthLabel = monthYearLabelID(grid.month, grid.year);

  // Per-column sticky offset/width driven by the shown identity columns.
  const colAt = (id: IdentityCol['id']) => {
    const i = identity.findIndex((c) => c.id === id);
    if (i === -1) return null;
    return { left: lefts[i], width: identity[i].width, isLast: i === identity.length - 1 };
  };
  const lastBorder = (isLast: boolean) => (isLast ? 'border-r-2 border-r-slate-300' : 'border-r');

  return (
    <div className="relative max-h-[78svh] overflow-auto rounded-lg border">
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
                  'sticky top-0 z-30 border-r border-b border-indigo-300/40 px-2 py-2 text-center font-semibold',
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
              className={cn(
                'sticky top-0 z-20 h-8 border-r border-b px-2 py-0 text-left align-middle font-semibold',
                HEAD_BG,
              )}
            >
              {/* pinned past the frozen columns so the label stays visible
                  while the ~31-day band scrolls horizontally */}
              <span className="sticky inline-block w-fit" style={{ left: idW + 12 }}>
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
            const noCol = colAt('no')!;
            const rpCol = colAt('rentalPartner');
            const cityCol = colAt('city')!;
            const plateCol = colAt('plate')!;
            const modelCol = colAt('model')!;
            const driverCol = colAt('driver')!;
            const tieringCol = colAt('tiering')!;
            const actionCol = colAt('action');
            return (
              <tr key={row.compositeKey} className="group">
                <td
                  className={cn(
                    'sticky z-10 border-b bg-white px-2 py-1 text-center text-slate-500 group-hover:bg-slate-50 dark:bg-slate-950',
                    lastBorder(noCol.isLast),
                  )}
                  style={{ left: noCol.left, width: noCol.width }}
                >
                  {idx + 1}
                </td>
                {rpCol && rpSpans[idx] !== undefined && (
                  <td
                    rowSpan={rpSpans[idx]}
                    className="sticky z-10 border-r border-b bg-slate-50 px-2 py-1 text-center align-middle font-semibold dark:bg-slate-900"
                    style={{ left: rpCol.left, width: rpCol.width }}
                  >
                    {row.rentalPartner || '-'}
                  </td>
                )}
                {citySpans[idx] !== undefined && (
                  <td
                    rowSpan={citySpans[idx]}
                    className="sticky z-10 border-r border-b bg-slate-50/70 px-2 py-1 text-center align-middle dark:bg-slate-900/70"
                    style={{ left: cityCol.left, width: cityCol.width }}
                  >
                    {row.city}
                  </td>
                )}
                <td
                  className={cn(
                    'sticky z-10 border-b bg-white px-2 py-1 text-center font-semibold group-hover:bg-slate-50 dark:bg-slate-950',
                    lastBorder(plateCol.isLast),
                  )}
                  style={{ left: plateCol.left, width: plateCol.width }}
                >
                  {row.plateNumber}
                </td>
                <td
                  className={cn(
                    'sticky z-10 truncate border-b bg-white px-2 py-1 text-center text-slate-600 group-hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300',
                    lastBorder(modelCol.isLast),
                  )}
                  style={{ left: modelCol.left, width: modelCol.width, maxWidth: modelCol.width }}
                  title={row.vehicleType}
                >
                  {row.vehicleType}
                </td>
                <td
                  className={cn(
                    'sticky z-10 border-b bg-white px-2 py-1 text-left group-hover:bg-slate-50 dark:bg-slate-950',
                    lastBorder(driverCol.isLast),
                  )}
                  style={{
                    left: driverCol.left,
                    width: driverCol.width,
                    maxWidth: driverCol.width,
                  }}
                >
                  <span className="flex items-center gap-1">
                    <span className="truncate font-semibold">{row.driverName}</span>
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
                <td
                  className={cn(
                    'sticky z-10 border-b bg-white px-2 py-1 text-center group-hover:bg-slate-50 dark:bg-slate-950',
                    lastBorder(tieringCol.isLast),
                  )}
                  style={{ left: tieringCol.left, width: tieringCol.width }}
                >
                  <Badge variant={row.tiering === 'JAWARA' ? 'default' : 'secondary'}>
                    {row.tiering}
                  </Badge>
                </td>
                {actionCol && (
                  <td
                    className={cn(
                      'sticky z-10 border-b bg-white px-1 py-1 text-center group-hover:bg-slate-50 dark:bg-slate-950',
                      lastBorder(actionCol.isLast),
                    )}
                    style={{ left: actionCol.left, width: actionCol.width }}
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
                )}

                {days.map((d) => {
                  const val = row.days[d]?.earning ?? 0;
                  return (
                    <td
                      key={d}
                      className={cn(
                        'border-r border-b px-1 py-1 text-right tabular-nums',
                        val > 0
                          ? 'bg-[#e8f5e9] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
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
