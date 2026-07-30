import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { monthYearLabelID } from '@/lib/datetime';
import { formatNumberID, formatRupiah } from '@/lib/money';
import {
  identityWidth,
  stickyLefts,
  type IdentityCol,
} from '@/features/fleet/components/stickyGrid';
import type { MonitoringMode } from '@/features/fleet/searchSchema';
import {
  ALL_FLEET_SOURCES,
  type AllFleetDayCell,
  type AllFleetGrid,
  type AllFleetRow,
} from '../types';
import { SOURCE_META, activeSources, cellTone, isClickable, toneClass } from '../lib/sourceTone';

// Subject × day matrix of the partner's whole fleet income. Same sticky-pivot
// mechanics as the Gojek and Grab grids (frozen identity columns, two-row header,
// sticky TOTAL row), with one difference: a cell can carry more than one income
// source, so its background says WHICH source and the cell lists the split.
//
// Column identity mirrors the mode: No · Plat · Driver (plate view) or
// No · Driver · Plat (driver view) — the second column is always the mirror
// subject, exactly like the Gojek grid's driver-history column.

const DAY_W = 78;
const SUMMARY: IdentityCol[] = [
  { id: 'gojek', label: 'Gojek', width: 112 },
  { id: 'grab', label: 'Grab', width: 112 },
  { id: 'rental', label: 'Rental', width: 112 },
  { id: 'total', label: 'Total', width: 128 },
];

const HEAD_BG = 'bg-primary text-primary-foreground';
const SUMMARY_BG = 'bg-green-600 text-white';
const nf = formatNumberID;
const rp = formatRupiah;

// The history column carries "<label> <from>–<to>", so it needs room for a name
// plus the range; the frozen block stays under ~350px either way.
function identityFor(mode: MonitoringMode): IdentityCol[] {
  return mode === 'driver'
    ? [
        { id: 'no', label: 'No', width: 40 },
        { id: 'subject', label: 'Driver', width: 148 },
        { id: 'history', label: 'Plat', width: 148 },
      ]
    : [
        { id: 'no', label: 'No', width: 40 },
        { id: 'subject', label: 'Plat', width: 124 },
        { id: 'history', label: 'Driver', width: 168 },
      ];
}

/** Day cell: the total, plus the per-source split when more than one source hit. */
function DayCellContent({ cell }: { cell: AllFleetDayCell | undefined }) {
  const active = activeSources(cell);
  if (!cell || (active.length === 0 && !cell.isZero)) {
    return <span aria-hidden>·</span>;
  }
  if (active.length === 0) return <>0</>;
  return (
    <>
      <span className="block">{nf(cell.total)}</span>
      {active.length > 1 &&
        active.map((source) => (
          <span key={source} className="block text-xs font-normal opacity-90">
            {SOURCE_META[source].short} {nf(cell[source])}
          </span>
        ))}
    </>
  );
}

function historyTitle(row: AllFleetRow): string {
  return row.history
    .map((h) => {
      const range = h.fromDay === h.toDay ? `${h.fromDay}` : `${h.fromDay}–${h.toDay}`;
      return `${h.label}${h.sublabel ? ` · ${h.sublabel}` : ''} (tgl ${range})`;
    })
    .join('\n');
}

export function AllFleetTable({
  grid,
  onCellClick,
}: {
  grid: AllFleetGrid;
  onCellClick: (key: string, day: number) => void;
}) {
  const identity = useMemo(() => identityFor(grid.mode), [grid.mode]);
  const lefts = useMemo(() => stickyLefts(identity), [identity]);
  const idW = useMemo(() => identityWidth(identity), [identity]);
  const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);
  const monthLabel = monthYearLabelID(grid.month, grid.year);
  // The residual row is rendered in the footer, above TOTAL: it is not a subject,
  // but its money is part of every total.
  const bodyRows = grid.rows;

  const stickyBase = 'sticky z-10 border-b bg-white group-hover:bg-slate-50 dark:bg-slate-950';
  const lastBorder = (isLast: boolean) => (isLast ? 'border-r-2 border-r-slate-300' : 'border-r');

  const renderDayCells = (row: AllFleetRow, options: { clickable: boolean }) =>
    days.map((day) => {
      const cell = row.days[day];
      const tone = cellTone(cell);
      const clickable = options.clickable && isClickable(cell);
      return (
        <td
          key={day}
          role={clickable ? 'button' : undefined}
          tabIndex={clickable ? 0 : undefined}
          aria-label={
            clickable ? `${row.label} tanggal ${day}: ${rp(cell?.total ?? 0)}` : undefined
          }
          title={
            cell
              ? activeSources(cell)
                  .map((source) => `${SOURCE_META[source].label}: ${rp(cell[source])}`)
                  .join(' · ') || 'Ada di data, Rp 0'
              : undefined
          }
          className={cn(
            'border-r border-b px-1 py-1 text-right tabular-nums',
            toneClass(tone),
            clickable && 'cursor-pointer hover:brightness-95',
          )}
          style={{ width: DAY_W }}
          onClick={clickable ? () => onCellClick(row.key, day) : undefined}
          onKeyDown={
            clickable
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onCellClick(row.key, day);
                  }
                }
              : undefined
          }
        >
          <DayCellContent cell={cell} />
        </td>
      );
    });

  const renderTotals = (totals: AllFleetRow['totals'], variant: 'row' | 'foot') => {
    const cellClass =
      variant === 'foot'
        ? 'sticky bottom-0 border-r border-b bg-indigo-50 px-2 py-1.5 text-right font-semibold tabular-nums dark:bg-indigo-950'
        : 'border-r border-b bg-white px-2 py-1 text-right tabular-nums dark:bg-slate-950';
    return (
      <>
        {ALL_FLEET_SOURCES.map((source, i) => (
          <td
            key={source}
            className={cn(
              cellClass,
              i === 0 && 'border-l-2 border-l-slate-300',
              totals[source] === 0 && variant === 'row' && 'text-slate-400',
            )}
          >
            {totals[source] === 0 && variant === 'row' ? '—' : rp(totals[source])}
          </td>
        ))}
        <td className={cn(cellClass, 'font-semibold')}>{rp(totals.total)}</td>
      </>
    );
  };

  return (
    <div className="relative scrollbar-slim max-h-none overflow-auto rounded-lg border md:max-h-[78svh]">
      <table
        className="border-separate border-spacing-0 text-xs"
        style={{ minWidth: idW + days.length * DAY_W + identityWidth(SUMMARY) }}
      >
        <thead>
          <tr>
            {identity.map((col, i) => (
              <th
                key={col.id}
                rowSpan={2}
                className={cn(
                  'sticky top-0 z-30 border-r border-b border-indigo-300/40 px-2 py-2 text-center font-semibold',
                  HEAD_BG,
                  i === identity.length - 1 && 'border-r-2 border-r-slate-300',
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
              {/* pinned past the frozen columns so the label stays readable while
                  the ~31-day band scrolls horizontally */}
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
              Pemasukan per Sumber
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
          {bodyRows.map((row, idx) => (
            <tr key={row.key} className="group">
              {identity.map((col, colIdx) => {
                const pos = {
                  left: lefts[colIdx],
                  width: col.width,
                  isLast: colIdx === identity.length - 1,
                };
                const base = cn(stickyBase, lastBorder(pos.isLast));

                if (col.id === 'no') {
                  return (
                    <td
                      key={col.id}
                      className={cn(base, 'px-2 py-1 text-center text-slate-500')}
                      style={{ left: pos.left, width: pos.width }}
                    >
                      {idx + 1}
                    </td>
                  );
                }

                if (col.id === 'subject') {
                  return (
                    <td
                      key={col.id}
                      className={cn(base, 'px-2 py-1 text-left')}
                      style={{ left: pos.left, width: pos.width, maxWidth: pos.width }}
                    >
                      <span className="block truncate font-semibold" title={row.label}>
                        {row.label}
                      </span>
                      {row.sublabel && (
                        <span
                          className="block truncate text-xs text-muted-foreground"
                          title={row.sublabel}
                        >
                          {row.sublabel}
                        </span>
                      )}
                      {row.totals.total === 0 && (
                        <span className="block text-xs text-muted-foreground italic">
                          Tanpa transaksi
                        </span>
                      )}
                    </td>
                  );
                }

                // history: the mirror subject with the days it was seen
                return (
                  <td
                    key={col.id}
                    className={cn(base, 'px-2 py-1 text-left')}
                    style={{ left: pos.left, width: pos.width, maxWidth: pos.width }}
                    title={row.history.length > 0 ? historyTitle(row) : undefined}
                  >
                    {row.history.length > 0 ? (
                      <div className="space-y-0.5">
                        {row.history.map((entry) => (
                          <div key={`${entry.label}-${entry.fromDay}`} className="truncate">
                            {entry.label}{' '}
                            <span className="text-slate-400">
                              {entry.fromDay === entry.toDay
                                ? entry.fromDay
                                : `${entry.fromDay}–${entry.toDay}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">·</span>
                    )}
                  </td>
                );
              })}

              {renderDayCells(row, { clickable: true })}
              {renderTotals(row.totals, 'row')}
            </tr>
          ))}

          {bodyRows.length === 0 && (
            <tr>
              <td
                colSpan={identity.length + days.length + SUMMARY.length}
                className="border-b px-3 py-10 text-slate-500"
              >
                {/* sticky: keeps the message inside the visible viewport of the
                    horizontally scrollable matrix */}
                <div className="sticky left-3 w-fit max-w-[calc(100%-1.5rem)]">
                  {grid.mode === 'driver'
                    ? 'Belum ada driver maupun pemasukan pada periode ini.'
                    : 'Belum ada armada maupun pemasukan pada periode ini.'}
                </div>
              </td>
            </tr>
          )}
        </tbody>

        <tfoot>
          {grid.residual && (
            <tr className="group">
              <td
                className={cn(stickyBase, 'border-r px-2 py-1 text-center text-slate-500')}
                style={{ left: lefts[0], width: identity[0].width }}
              />
              <td
                className={cn(stickyBase, 'border-r px-2 py-1 text-left')}
                style={{
                  left: lefts[1],
                  width: identity[1].width,
                  maxWidth: identity[1].width,
                }}
              >
                <span className="block truncate font-semibold italic">{grid.residual.label}</span>
                <span className="block text-xs text-muted-foreground">tidak terpetakan</span>
              </td>
              <td
                className={cn(stickyBase, 'border-r-2 border-r-slate-300 px-2 py-1 text-left')}
                style={{
                  left: lefts[2],
                  width: identity[2].width,
                  maxWidth: identity[2].width,
                }}
                title={grid.residual.history.length > 0 ? historyTitle(grid.residual) : undefined}
              >
                {grid.residual.history.length > 0 ? (
                  <div className="space-y-0.5">
                    {grid.residual.history.map((entry) => (
                      <div key={`${entry.label}-${entry.fromDay}`} className="truncate">
                        {entry.label}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400">·</span>
                )}
              </td>
              {renderDayCells(grid.residual, { clickable: true })}
              {renderTotals(grid.residual.totals, 'row')}
            </tr>
          )}

          <tr className="font-semibold">
            <td
              colSpan={identity.length}
              className="sticky bottom-0 left-0 z-20 border-r-2 border-b border-r-slate-300 bg-indigo-50 px-2 py-1.5 text-right dark:bg-indigo-950"
            >
              TOTAL
            </td>
            {days.map((day) => {
              const cell = grid.dailyTotals[day];
              return (
                <td
                  key={day}
                  className="sticky bottom-0 border-r border-b bg-indigo-50 px-1 py-1.5 text-right tabular-nums dark:bg-indigo-950"
                  style={{ width: DAY_W }}
                >
                  {cell && cell.total !== 0 ? nf(cell.total) : '—'}
                </td>
              );
            })}
            {renderTotals(grid.totals, 'foot')}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
