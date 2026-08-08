// PURE cell color-coding — ports the legacy evista-backend logic EXACTLY
// (AdminFleetMonitoringController + _table.blade.php). No React, no I/O.
// Color is derived from backend-computed numbers/flags, never client math.

export type CellTone =
  | 'empty' //   putih   — tidak ada di data import
  | 'zero' //    merah   — ada di data, nominal Rp0
  | 'below' //   kuning  — counted < target harian
  | 'target' //  hijau   — counted >= target harian
  | 'manual' //  ungu    — manual payment
  | 'mixed' //   oranye  — gabungan (deduction + manual)
  | 'bebas' //   biru    — exception bebas setoran (rental)
  | 'nonop'; //  abu     — exception tidak beroperasi

// Backend-provided per-day facts the tone is derived from (brief §2.A).
export type DayFacts = {
  displayAmount: number; // nominal yang ditampilkan di sel
  countedAmount: number; // nominal yang dihitung ke setoran
  isManualPayment?: boolean;
  hasDisplayOnlyManualPayment?: boolean; // manual "tidak masuk setoran"
  isMixed?: boolean; // >1 jenis transaksi di hari itu (deduction + manual)
  exception?: { isBebasSetoran: boolean; keterangan: string | null } | null;
};

/**
 * Ports `_table.blade.php` cell-class logic verbatim (priority order matters):
 *  1. exception & no display amount → biru (bebas) / abu (non-op)
 *  2. mixed                        → oranye
 *  3. display-only manual, no counted → ungu
 *  4. manual payment              → ungu
 *  5. in data: counted>=target hijau · counted<target kuning · display==0 merah
 *  6. otherwise                   → putih (tidak ada di data)
 */
export function cellTone(facts: DayFacts | undefined, dailyTarget: number): CellTone {
  if (!facts) return 'empty';

  const { displayAmount, countedAmount, exception, isMixed } = facts;
  const hasDisplay = displayAmount > 0;
  const hasCounted = countedAmount > 0;

  if (exception && !hasDisplay) {
    return exception.isBebasSetoran ? 'bebas' : 'nonop';
  }
  if (isMixed) return 'mixed';
  if (facts.hasDisplayOnlyManualPayment && !hasCounted) return 'manual';
  if (facts.isManualPayment) return 'manual';

  // present in daily data
  if (hasCounted && countedAmount >= dailyTarget) return 'target';
  if (hasCounted && countedAmount < dailyTarget) return 'below';
  if (displayAmount === 0) return 'zero';

  return 'empty';
}

// Tailwind palette classes carrying the legacy spreadsheet legend semantics
// (red=zero, yellow=below target, green=on target, purple=manual, orange=mixed,
// blue=bebas, gray=non-op).
const TONE_CLASSES: Record<CellTone, string> = {
  empty: 'bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-600',
  zero: 'bg-red-200 text-slate-900',
  below: 'bg-yellow-300 text-slate-900',
  target: 'bg-green-400 text-slate-900 font-bold',
  manual: 'bg-purple-600 text-white font-bold text-center',
  mixed: 'bg-orange-500 text-white font-bold text-center',
  bebas: 'bg-blue-500 text-white font-bold text-center',
  nonop: 'bg-gray-500 text-white font-bold text-center',
};

export function toneClass(tone: CellTone): string {
  return TONE_CLASSES[tone];
}

// The same legend expressed as INK instead of fill, for a grid whose background
// is already saying something else (All Fleet Monitoring paints the background
// per income source). Same hues as TONE_CLASSES, darkened/lightened so the
// figure stays legible on the pale source tints in both themes.
const TONE_TEXT_CLASSES: Record<CellTone, string> = {
  empty: 'text-slate-400 dark:text-slate-600',
  zero: 'text-red-700 dark:text-red-300',
  below: 'text-amber-700 dark:text-amber-300',
  target: 'text-green-700 dark:text-green-300',
  manual: 'text-purple-700 dark:text-purple-300',
  mixed: 'text-orange-700 dark:text-orange-300',
  bebas: 'text-blue-700 dark:text-blue-300',
  nonop: 'text-slate-600 dark:text-slate-400',
};

export function toneTextClass(tone: CellTone): string {
  return TONE_TEXT_CLASSES[tone];
}

/** Human label of a tone, for tooltips and screen readers. */
export const TONE_LABEL: Record<CellTone, string> = {
  empty: 'Tidak ada di data',
  zero: 'Ada di data, Rp 0',
  below: 'Kurang dari target',
  target: 'Sesuai target',
  manual: 'Manual Payment',
  mixed: 'Gabungan (Deduction + Manual)',
  bebas: 'Bebas Setoran',
  nonop: 'Tidak Beroperasi',
};

// Is this tone clickable to open the transaction breakdown modal?
// (Legacy: only value/manual/mixed cells carry the breakdown-btn class.)
export function toneClickable(tone: CellTone): boolean {
  return tone === 'target' || tone === 'below' || tone === 'manual' || tone === 'mixed';
}

// Legend rows for the UI (label + swatch tone), in legacy order.
export const CELL_LEGEND: { tone: CellTone | 'empty'; label: string }[] = [
  { tone: 'target', label: 'Sesuai Target' },
  { tone: 'below', label: 'Kurang dari Target' },
  { tone: 'zero', label: 'Kosong (ada di data, Rp0)' },
  { tone: 'empty', label: 'Kosong (tidak ada di data)' },
  { tone: 'manual', label: 'Manual Payment' },
  { tone: 'mixed', label: 'Gabungan (Deduction + Manual)' },
  { tone: 'bebas', label: 'Bebas Setoran (Exc)' },
  { tone: 'nonop', label: 'Tidak Beroperasi (Exc)' },
];
