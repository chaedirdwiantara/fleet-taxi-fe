import { useMemo } from 'react';
import { Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { monthYearLabelID } from '@/lib/datetime';
import { formatNumberID, formatRupiah } from '@/lib/money';
import { groupRowSpans, identityWidth, stickyLefts, type IdentityCol } from '@/features/fleet/components/stickyGrid';
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
}: {
  grid: GrabGrid;
  onDriverDetail: (compositeKey: string) => void;
  onEditDriver: (row: GrabRow) => void;
}) {
  const lefts = useMemo(() => stickyLefts(IDENTITY), []);
  const idW = useMemo(() => identityWidth(IDENTITY), []);
  const rpSpans = useMemo(() => groupRowSpans(grid.rows, (r) => r.rentalPartner), [grid.rows]);
  const citySpans = useMemo(
    () => groupRowSpans(grid.rows, (r) => `${r.rentalPartner}|${r.city}`),
    [grid.rows],
  );
  const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);
  const monthLabel = monthYearLabelID(grid.month, grid.year);

  return (
    <div className="relative max-h-[78svh] overflow-auto rounded-lg border">
      <table className="border-separate border-spacing-0 text-xs" style={{ minWidth: idW + days.length * DAY_W + identityWidth(SUMMARY) }}>
        <thead>
          <tr>
            {IDENTITY.map((c, i) => (
              <th
                key={c.id}
                rowSpan={2}
                className={cn(
                  'sticky top-0 z-30 border-b border-r border-indigo-300/40 px-2 py-2 text-center font-semibold',
                  HEAD_BG,
                  c.id === 'action' && 'border-r-2 border-r-slate-300',
                )}
                style={{ left: lefts[i], width: c.width, minWidth: c.width }}
              >
                {c.label}
              </th>
            ))}
            <th colSpan={days.length} className={cn('sticky top-0 z-20 border-b border-r px-2 py-1.5 text-center font-semibold', HEAD_BG)}>
              Tanggal ({monthLabel})
            </th>
            <th colSpan={SUMMARY.length} className={cn('sticky top-0 z-20 border-b border-l-2 border-l-slate-300 px-2 py-1.5 text-center font-semibold', SUMMARY_BG)}>
              Monthly Summary
            </th>
          </tr>
          <tr>
            {days.map((d) => (
              <th key={d} className={cn('sticky top-[33px] z-20 border-b border-r px-1 py-1 text-center font-medium', HEAD_BG)} style={{ width: DAY_W, minWidth: DAY_W }}>
                {d}
              </th>
            ))}
            {SUMMARY.map((c, i) => (
              <th
                key={c.id}
                className={cn('sticky top-[33px] z-20 border-b border-r px-1 py-1 text-center font-medium', SUMMARY_BG, i === 0 && 'border-l-2 border-l-slate-300')}
                style={{ width: c.width, minWidth: c.width }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {grid.rows.map((row, idx) => (
            <tr key={row.compositeKey} className="group">
              <td className="sticky z-10 border-b border-r bg-white px-2 py-1 text-center text-slate-500 group-hover:bg-slate-50 dark:bg-slate-950" style={{ left: lefts[0], width: IDENTITY[0].width }}>
                {idx + 1}
              </td>
              {rpSpans[idx] !== undefined && (
                <td rowSpan={rpSpans[idx]} className="sticky z-10 border-b border-r bg-slate-50 px-2 py-1 text-center align-middle font-semibold dark:bg-slate-900" style={{ left: lefts[1], width: IDENTITY[1].width }}>
                  {row.rentalPartner || '-'}
                </td>
              )}
              {citySpans[idx] !== undefined && (
                <td rowSpan={citySpans[idx]} className="sticky z-10 border-b border-r bg-slate-50/70 px-2 py-1 text-center align-middle dark:bg-slate-900/70" style={{ left: lefts[2], width: IDENTITY[2].width }}>
                  {row.city}
                </td>
              )}
              <td className="sticky z-10 border-b border-r bg-white px-2 py-1 text-center font-semibold group-hover:bg-slate-50 dark:bg-slate-950" style={{ left: lefts[3], width: IDENTITY[3].width }}>
                {row.plateNumber}
              </td>
              <td className="sticky z-10 truncate border-b border-r bg-white px-2 py-1 text-center text-slate-600 group-hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300" style={{ left: lefts[4], width: IDENTITY[4].width, maxWidth: IDENTITY[4].width }} title={row.vehicleType}>
                {row.vehicleType}
              </td>
              <td className="sticky z-10 border-b border-r bg-white px-2 py-1 text-left group-hover:bg-slate-50 dark:bg-slate-950" style={{ left: lefts[5], width: IDENTITY[5].width, maxWidth: IDENTITY[5].width }}>
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
              <td className="sticky z-10 border-b border-r bg-white px-2 py-1 text-center group-hover:bg-slate-50 dark:bg-slate-950" style={{ left: lefts[6], width: IDENTITY[6].width }}>
                <Badge variant={row.tiering === 'JAWARA' ? 'default' : 'secondary'}>{row.tiering}</Badge>
              </td>
              <td className="sticky z-10 border-b border-r-2 border-r-slate-300 bg-white px-1 py-1 text-center group-hover:bg-slate-50 dark:bg-slate-950" style={{ left: lefts[7], width: IDENTITY[7].width }}>
                <button
                  type="button"
                  aria-label={`Edit ${row.plateNumber}`}
                  onClick={() => onEditDriver(row)}
                  className="inline-flex size-6 items-center justify-center rounded text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <Pencil className="size-3.5" />
                </button>
              </td>

              {days.map((d) => {
                const val = row.days[d]?.earning ?? 0;
                return (
                  <td
                    key={d}
                    className={cn('border-b border-r px-1 py-1 text-right tabular-nums', val > 0 ? 'bg-[#e8f5e9] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-white text-slate-400 dark:bg-slate-950')}
                    style={{ width: DAY_W }}
                    title={val > 0 ? rp(val) : undefined}
                  >
                    {val > 0 ? nf(val) : '-'}
                  </td>
                );
              })}

              <td className="border-b border-l-2 border-l-slate-300 border-r bg-emerald-50/60 px-2 py-1 text-right font-semibold tabular-nums dark:bg-emerald-950/40">{rp(row.summary.earning)}</td>
              <td className="border-b border-r bg-emerald-50/60 px-2 py-1 text-right tabular-nums dark:bg-emerald-950/40">{rp(row.summary.incentive)}</td>
              <td className="border-b border-r bg-emerald-50/60 px-2 py-1 text-right tabular-nums dark:bg-emerald-950/40">{rp(row.summary.driverFare)}</td>
              <td className="border-b border-r bg-emerald-50/60 px-2 py-1 text-right tabular-nums dark:bg-emerald-950/40">{nf(row.summary.rides)}</td>
            </tr>
          ))}
          {grid.rows.length === 0 && (
            <tr>
              <td colSpan={IDENTITY.length + days.length + SUMMARY.length} className="border-b px-3 py-10 text-center text-slate-500">
                Tidak ada data untuk periode / filter ini.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
