// Money is integer rupiah end to end (PROJECT-BRIEF.md §7) — these helpers
// FORMAT for display only; they never compute or derive amounts.

const full = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** 1234567 → "Rp1.234.567" */
export function formatRupiah(amount: number): string {
  return full.format(amount);
}

/** 488000 → "488 rb" — for tight grid cells; full value belongs in a tooltip. */
export function formatRupiahCompact(amount: number): string {
  return compact.format(amount);
}

const plain = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** 1234567 → "1.234.567" — plain grouped integer (no currency symbol). */
export function formatNumberID(amount: number): string {
  return plain.format(amount);
}
