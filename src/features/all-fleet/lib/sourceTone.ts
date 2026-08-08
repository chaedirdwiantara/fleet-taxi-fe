// PURE cell presentation for the All Fleet matrix. Two independent readings sit
// in one cell, so they use two different channels:
//
//   • the BACKGROUND says which source the money came from (Gojek / Grab /
//     Rental / more than one);
//   • the FIGURE's colour says what Gojek Monitoring would say about that day —
//     sesuai target, kurang dari target, Rp 0, Manual Payment, gabungan, bebas
//     setoran, tidak beroperasi.
//
// Grab and Rental carry no daily setoran target in this product, so their days
// keep their source colour as ink too.
//
// The source fills are pale washes rather than the solid legend chips: a
// coloured figure is unreadable on a saturated fill (amber on green-500 lands
// near 2:1, far under AA), and the status channel is worth more than the extra
// saturation. Same hues, so the legend still reads.
//
// No React, no I/O, no money math — the amounts arrive already computed.
//
// Palette note: like features/fleet/lib/thresholds.ts, this is the sanctioned
// exception to "tokens only" in DESIGN-SYSTEM.md §1 — it reproduces a business
// spreadsheet legend where each income source has a fixed color, and the colors
// are matched to the platform screens (Gojek green, Grab orange, Rental blue).
import {
  cellTone as gojekCellTone,
  toneTextClass as statusTextClass,
  TONE_LABEL,
  type CellTone as GojekTone,
} from '@/features/fleet/lib/thresholds';
import { ALL_FLEET_SOURCES, type AllFleetDayCell, type AllFleetSource } from '../types';

export type SourceMeta = {
  label: string;
  short: string;
  /** Solid chip — legend swatches and anything that is not a data cell. */
  swatch: string;
  /** Pale wash — the data cell's own background. */
  fill: string;
  text: string;
};

export const SOURCE_META: Record<AllFleetSource, SourceMeta> = {
  gojek: {
    label: 'Gojek',
    short: 'G',
    swatch: 'bg-green-500',
    fill: 'bg-green-500/15 dark:bg-green-500/25',
    text: 'text-green-700 dark:text-green-400',
  },
  grab: {
    label: 'Grab',
    short: 'Gr',
    swatch: 'bg-orange-500',
    fill: 'bg-orange-500/15 dark:bg-orange-500/25',
    text: 'text-orange-700 dark:text-orange-400',
  },
  rental: {
    label: 'Rental',
    short: 'R',
    swatch: 'bg-blue-500',
    fill: 'bg-blue-500/15 dark:bg-blue-500/25',
    text: 'text-blue-700 dark:text-blue-400',
  },
};

/** More than one source on the same day, and "in the data but Rp 0". */
export const MIXED_SWATCH = 'bg-teal-500';
export const ZERO_SWATCH = 'bg-pink-300';
const MIXED_FILL = 'bg-teal-500/18 dark:bg-teal-500/28';
const MIXED_TEXT = 'text-teal-800 dark:text-teal-300';

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
  // A moneyless day still belongs to Gojek when Gojek reported on it — that is
  // how a bebas-setoran day or a display-only Manual Payment keeps its identity
  // instead of reading as an empty cell.
  if (cell?.gojekDay) return { kind: 'single', source: 'gojek' };
  if (cell?.isZero) return { kind: 'zero' };
  return { kind: 'empty' };
}

/** Background classes for a tone (light and dark) — the SOURCE channel. */
export function toneClass(tone: CellTone): string {
  switch (tone.kind) {
    case 'mixed':
      return MIXED_FILL;
    case 'single':
      return SOURCE_META[tone.source].fill;
    case 'zero':
      return 'bg-pink-500/20 dark:bg-pink-500/25';
    case 'empty':
      return 'bg-white dark:bg-slate-900';
  }
}

/** Gojek Monitoring's verdict for the day, or null when Gojek said nothing. */
export function gojekStatus(cell: AllFleetDayCell | undefined): GojekTone | null {
  if (!cell?.gojekDay) return null;
  return gojekCellTone(cell.gojekDay, cell.gojekDay.dailyTarget);
}

/** The verdict in words, for the cell's tooltip and its accessible name. */
export function gojekStatusLabel(cell: AllFleetDayCell | undefined): string | null {
  const tone = gojekStatus(cell);
  return tone ? TONE_LABEL[tone] : null;
}

/**
 * Ink classes for the figure — the STATUS channel.
 *
 * The figure is coloured by whoever EARNED it. Gojek's verdict applies when
 * Gojek contributed the money, or when the cell has no money at all and Gojek
 * is the only thing in it (a bebas-setoran day, a display-only Manual Payment);
 * a figure that is purely Grab earning or Rental omset keeps its source colour,
 * even on a day Gojek happened to flag, because those sources carry no target
 * and it is not Gojek's number to judge. The Gojek note still rides along in the
 * cell's tooltip either way.
 */
export function numberToneClass(cell: AllFleetDayCell | undefined): string {
  const gojekOwnsTheFigure = !!cell && (cell.gojek !== 0 || cell.total === 0);
  const status = gojekOwnsTheFigure ? gojekStatus(cell) : null;
  if (status) return statusTextClass(status);
  const tone = cellTone(cell);
  switch (tone.kind) {
    case 'mixed':
      return MIXED_TEXT;
    case 'single':
      return SOURCE_META[tone.source].text;
    case 'zero':
      return 'text-pink-800 dark:text-pink-300';
    case 'empty':
      return 'text-slate-400 dark:text-slate-600';
  }
}

/**
 * A cell is clickable when it has something to drill into: money, a Rp 0 that
 * IS in the data, or a Gojek day worth explaining (exception / manual payment).
 */
export function isClickable(cell: AllFleetDayCell | undefined): boolean {
  return cellTone(cell).kind !== 'empty';
}

/** Legend rows for the BACKGROUND channel, in the order the page renders them. */
export const SOURCE_LEGEND: { swatch: string; label: string; hint?: string }[] = [
  { swatch: SOURCE_META.gojek.swatch, label: 'Gojek', hint: 'setoran' },
  { swatch: SOURCE_META.grab.swatch, label: 'Grab', hint: 'earning' },
  { swatch: SOURCE_META.rental.swatch, label: 'Rental', hint: 'omset Rental Monitoring' },
  { swatch: MIXED_SWATCH, label: 'Gabungan', hint: 'lebih dari satu sumber' },
  { swatch: ZERO_SWATCH, label: 'Kosong', hint: 'ada di data, Rp 0' },
];

/** Legend rows for the INK channel — Gojek Monitoring's legend, verbatim. */
export const STATUS_LEGEND: { tone: GojekTone; label: string }[] = (
  ['target', 'below', 'zero', 'manual', 'mixed', 'bebas', 'nonop'] as const
).map((tone) => ({ tone, label: TONE_LABEL[tone] }));

export { statusTextClass };
