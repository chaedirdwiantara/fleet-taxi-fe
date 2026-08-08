// PURE cell presentation for the Rental Monitoring pivot. No React, no I/O, no
// money math.
//
// Rental has no daily setoran target the way Gojek does, so the question a cell
// answers is not "did it hit the number" but "has this money arrived": green
// once the booking is settled, amber while it is still outstanding, neutral on a
// day the car sat idle.
//
// Palette note: same sanctioned exception to "tokens only" (DESIGN-SYSTEM.md §1)
// as features/fleet/lib/thresholds.ts — green/amber here mean exactly what they
// mean on the Gojek grid (money in / money still expected), which is why they
// are palette colours rather than semantic tokens.
import type { RentalGridDayCell } from '../types';

export type RentalDayTone = 'paid' | 'unpaid' | 'idle';

const TONE_CLASSES: Record<RentalDayTone, string> = {
  paid: 'bg-green-500/15 font-semibold text-green-700 dark:bg-green-500/25 dark:text-green-300',
  unpaid: 'bg-amber-400/25 font-semibold text-amber-800 dark:bg-amber-400/20 dark:text-amber-300',
  idle: 'bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-600',
};

/** Solid chips for the legend, where there is no figure to keep legible. */
const TONE_SWATCHES: Record<RentalDayTone, string> = {
  paid: 'bg-green-500',
  unpaid: 'bg-amber-400',
  idle: 'bg-white dark:bg-slate-900',
};

export const TONE_LABEL: Record<RentalDayTone, string> = {
  paid: 'Sudah Dibayar',
  unpaid: 'Belum Dibayar',
  idle: 'Tidak tersewa',
};

export function dayTone(cell: RentalGridDayCell | undefined): RentalDayTone {
  if (!cell) return 'idle';
  return cell.paymentStatus === 'Sudah Dibayar' ? 'paid' : 'unpaid';
}

export function toneClass(tone: RentalDayTone): string {
  return TONE_CLASSES[tone];
}

export function toneSwatch(tone: RentalDayTone): string {
  return TONE_SWATCHES[tone];
}

/** A cell opens its booking detail only when there IS a booking. */
export function isClickable(cell: RentalGridDayCell | undefined): boolean {
  return dayTone(cell) !== 'idle';
}

/**
 * Share of the month the plate was rented out, 0..1. A day count over a day
 * count — no money is derived here, so this stays on the client.
 */
export function utilization(rentedDays: number, daysInMonth: number): number {
  return daysInMonth > 0 ? rentedDays / daysInMonth : 0;
}

/** "39%" — utilisation for display, rounded to a whole percent. */
export function formatUtilization(rentedDays: number, daysInMonth: number): string {
  return `${Math.round(utilization(rentedDays, daysInMonth) * 100)}%`;
}

export const LEGEND: { tone: RentalDayTone; label: string; hint?: string }[] = [
  { tone: 'paid', label: TONE_LABEL.paid, hint: 'omset sudah diterima' },
  { tone: 'unpaid', label: TONE_LABEL.unpaid, hint: 'masih tertagih' },
  { tone: 'idle', label: TONE_LABEL.idle, hint: 'plat menganggur hari itu' },
];
