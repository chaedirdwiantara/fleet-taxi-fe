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
import {
  SOURCE_META,
  activeSources,
  cellTone,
  gojekStatusLabel,
  isClickable,
  numberToneClass,
  toneClass,
} from '../lib/sourceTone';

// Subject × day matrix of the partner's whole fleet income. Same sticky-pivot
// mechanics as the Gojek and Grab grids (frozen identity columns, two-row header,
// sticky TOTAL row), with one difference: a cell carries TWO readings at once —
// its background says which income SOURCE the day came from, and the colour of
// the figure says what Gojek Monitoring says about that day (sesuai target,
// kurang dari target, Manual Payment, bebas setoran…).
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

/**
 * What the figure in a day cell reads, following Gojek Monitoring's own rules
 * for the days Gojek reported on:
 *  • an exception with nothing collected shows its reason ("Rental" / the note);
 *  • a day that IS in the data but collected nothing shows an explicit "0";
 *  • a day with no data at all shows the "·" placeholder.
 */
function dayLabel(cell: AllFleetDayCell | undefined): string {
  if (!cell) return '·';
  if (cell.total !== 0) return nf(cell.total);
  const exception = cell.gojekDay?.exception;
  if (exception && (cell.gojekDay?.displayAmount ?? 0) === 0) {
    return exception.isBebasSetoran ? 'Rental' : (exception.keterangan ?? '').slice(0, 6) || '—';
  }
  return cell.isZero || cell.gojekDay ? '0' : '·';
}

/** Day cell: the total, plus the per-source split when more than one source hit. */
function DayCellContent({ cell }: { cell: AllFleetDayCell | undefined }) {
  const active = activeSources(cell);
  const label = dayLabel(cell);
  if (label === '·') return <span aria-hidden>·</span>;
  return (
    <>
      <span className="block">{label}</span>
      {active.length > 1 &&
        active.map((source) => (
          <span key={source} className={cn('block text-xs font-normal', SOURCE_META[source].text)}>
            {SOURCE_META[source].short} {nf(cell![source])}
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
      // Both readings of the cell, spelled out: where the money came from, and
      // Gojek's verdict on the day. The tooltip is the only place a colour-blind
      // (or simply unsure) reader can confirm what the ink colour means.
      const status = gojekStatusLabel(cell);
      const sourceLines = activeSources(cell).map(
        (source) => `${SOURCE_META[source].label}: ${rp(cell![source])}`,
      );
      const description = [
        ...sourceLines,
        status && `Status Gojek: ${status}`,
        cell?.gojekDay?.exception?.keterangan,
      ]
        .filter(Boolean)
        .join(' · ');
      return (
        <td
          key={day}
          role={clickable ? 'button' : undefined}
          tabIndex={clickable ? 0 : undefined}
          aria-label={
            clickable
              ? `${row.label} tanggal ${day}: ${rp(cell?.total ?? 0)}${status ? ` — ${status}` : ''}`
              : undefined
          }
          title={cell ? description || 'Ada di data, Rp 0' : undefined}
          className={cn(
            'border-r border-b px-1 py-1 text-right font-semibold tabular-nums',
            toneClass(tone),
            numberToneClass(cell),
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
