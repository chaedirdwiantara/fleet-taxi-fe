// PURE cell presentation for the All Fleet matrix: which sources a day carries,
// and therefore what the cell looks like. No React, no I/O, no money math — the
// amounts arrive already computed from the backend.
//
// Palette note: like features/fleet/lib/thresholds.ts, this is the sanctioned
// exception to "tokens only" in DESIGN-SYSTEM.md §1 — it reproduces a business
// spreadsheet legend where each income source has a fixed color, and the colors
// are matched to the platform screens (Gojek green, Grab orange, Rental blue).
import { ALL_FLEET_SOURCES, type AllFleetDayCell, type AllFleetSource } from '../types';

export type SourceMeta = { label: string; short: string; swatch: string; text: string };

export const SOURCE_META: Record<AllFleetSource, SourceMeta> = {
  gojek: {
    label: 'Gojek',
    short: 'G',
    swatch: 'bg-green-500',
    text: 'text-green-700 dark:text-green-400',
  },
  grab: {
    label: 'Grab',
    short: 'Gr',
    swatch: 'bg-orange-500',
    text: 'text-orange-700 dark:text-orange-400',
  },
  rental: {
    label: 'Rental',
    short: 'R',
    swatch: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
  },
};

/** More than one source on the same day, and "in the data but Rp 0". */
export const MIXED_SWATCH = 'bg-teal-500';
// Like the Gojek grid's own tones, the spreadsheet colors keep their value in
// dark mode — the legend and the cells must read the same in both themes.
export const ZERO_SWATCH = 'bg-pink-200';

export type CellTone =
  | { kind: 'empty' } //  no data that day
  | { kind: 'zero' } //   present in the data, earned Rp 0
  | { kind: 'single'; source: AllFleetSource }
  | { kind: 'mixed' }; //  more than one source

/** Sources that actually carry money in this cell, in display order. */
export function activeSources(cell: AllFleetDayCell | undefined): AllFleetSource[] {
  if (!cell) return [];
  return ALL_FLEET_SOURCES.filter((source) => cell[source] !== 0);
}

export function cellTone(cell: AllFleetDayCell | undefined): CellTone {
  const active = activeSources(cell);
  if (active.length > 1) return { kind: 'mixed' };
  if (active.length === 1) return { kind: 'single', source: active[0] };
  if (cell?.isZero) return { kind: 'zero' };
  return { kind: 'empty' };
}

/** Background + text classes for a tone (light and dark). */
export function toneClass(tone: CellTone): string {
  switch (tone.kind) {
    case 'mixed':
      return 'bg-teal-500 font-semibold text-white';
    case 'single':
      return `${SOURCE_META[tone.source].swatch} font-semibold text-white`;
    case 'zero':
      return 'bg-pink-200 text-slate-900';
    case 'empty':
      return 'bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-600';
  }
}

/** A cell is clickable when it has something to drill into. */
export function isClickable(cell: AllFleetDayCell | undefined): boolean {
  const tone = cellTone(cell);
  return tone.kind !== 'empty';
}

/** Legend rows, in the order the page renders them. */
export const CELL_LEGEND: { swatch: string; label: string; hint?: string }[] = [
  { swatch: SOURCE_META.gojek.swatch, label: 'Gojek', hint: 'setoran' },
  { swatch: SOURCE_META.grab.swatch, label: 'Grab', hint: 'earning' },
  { swatch: SOURCE_META.rental.swatch, label: 'Rental', hint: 'omset Rental Monitoring' },
  { swatch: MIXED_SWATCH, label: 'Gabungan', hint: 'lebih dari satu sumber' },
  { swatch: ZERO_SWATCH, label: 'Kosong', hint: 'ada di data, Rp 0' },
];
