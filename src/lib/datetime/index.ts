// Asia/Jakarta helpers (PROJECT-BRIEF.md §7): timestamps are stored UTC and
// converted to WIB only at display / day-period bucketing. All conversion
// lives here — nowhere else (guardrail §11).

const WIB = 'Asia/Jakarta';

function wibParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function currentMonthWIB(now: Date = new Date()): number {
  return wibParts(now).month;
}

export function currentYearWIB(now: Date = new Date()): number {
  return wibParts(now).year;
}

/** Number of days in a calendar month (month is 1-based). Pure — no timezone. */
export function daysInMonth(month: number, year: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Display a UTC ISO timestamp as a WIB date-time string. */
export function formatDateTimeWIB(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

/** "Juni 2026" from a (month 1..12, year) period. */
export function monthYearLabelID(month: number, year: number): string {
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

/** ["Januari".."Desember"] for month pickers. */
export const MONTH_NAMES_ID = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(Date.UTC(2020, i, 1))),
);

/** Display a plain `YYYY-MM-DD` business date (already a WIB calendar day). */
export function formatDateID(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
