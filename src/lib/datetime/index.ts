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

/** "Agu 2026" from a `YYYY-MM` period — compact enough for a table column. */
export function monthYearShortID(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

/** "Mei–Agu 2026" / "Agu 2026" — the span two `YYYY-MM` bounds cover. */
export function monthRangeShortID(from: string, to: string): string {
  if (from === to) return monthYearShortID(from);
  const [fromYear] = from.split('-').map(Number);
  const [toYear] = to.split('-').map(Number);
  // Same year → the year is said once, at the end.
  if (fromYear === toYear) {
    const monthShort = new Intl.DateTimeFormat('id-ID', { month: 'short' });
    const [, fromMonth] = from.split('-').map(Number);
    return `${monthShort.format(new Date(Date.UTC(fromYear, fromMonth - 1, 1)))}–${monthYearShortID(to)}`;
  }
  return `${monthYearShortID(from)}–${monthYearShortID(to)}`;
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

// ── business-date arithmetic (`YYYY-MM-DD`, WIB calendar days) ───────────────
// The wire format for the dashboards' date-range filter. These are plain
// calendar days with no time component, so UTC is used purely as a stable
// arithmetic base — never as a timezone.

const MS_PER_DAY = 86_400_000;

/** Inclusive business-date range — the shape the API's ?dateFrom&dateTo takes. */
export type DateRangeValue = { dateFrom: string; dateTo: string };

/** Epoch of a business date. Internal: day arithmetic only. */
function epochOf(isoDate: string): number {
  return Date.UTC(
    Number(isoDate.slice(0, 4)),
    Number(isoDate.slice(5, 7)) - 1,
    Number(isoDate.slice(8, 10)),
  );
}

/** `YYYY-MM-DD` for a (year, 1-based month, day) triple. */
export function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseISODate(isoDate: string): { year: number; month: number; day: number } {
  return {
    year: Number(isoDate.slice(0, 4)),
    month: Number(isoDate.slice(5, 7)),
    day: Number(isoDate.slice(8, 10)),
  };
}

/** Today as a WIB business date. */
export function todayWIB(now: Date = new Date()): string {
  const { year, month, day } = wibParts(now);
  return toISODate(year, month, day);
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(epochOf(isoDate) + days * MS_PER_DAY);
  return toISODate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffDaysISO(from: string, to: string): number {
  return Math.round((epochOf(to) - epochOf(from)) / MS_PER_DAY);
}

/** Days a range covers, both ends inclusive. */
export function daysInRangeISO(from: string, to: string): number {
  return diffDaysISO(from, to) + 1;
}

export function monthStartISO(month: number, year: number): string {
  return toISODate(year, month, 1);
}

export function monthEndISO(month: number, year: number): string {
  return toISODate(year, month, daysInMonth(month, year));
}

/**
 * Column of the 1st of a month in a Monday-first calendar grid (0 = Monday),
 * i.e. how many blank cells the grid starts with.
 */
export function firstWeekdayOffset(month: number, year: number): number {
  return (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
}

/** "15 Jul 2026" — compact business-date label. */
export function formatDateShortID(isoDate: string): string {
  const { year, month, day } = parseISODate(isoDate);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * Human range label, dropping whatever both ends already share:
 * "15 Jul 2026" · "1 – 15 Jul 2026" · "25 Jul – 5 Agu 2026" · across years the
 * full date on both sides.
 */
export function formatDateRangeID(from: string, to: string): string {
  if (from === to) return formatDateShortID(from);
  const a = parseISODate(from);
  const b = parseISODate(to);
  if (a.year !== b.year) return `${formatDateShortID(from)} – ${formatDateShortID(to)}`;
  if (a.month !== b.month) {
    const monthShort = new Intl.DateTimeFormat('id-ID', { month: 'short' });
    const fromLabel = `${a.day} ${monthShort.format(new Date(Date.UTC(a.year, a.month - 1, 1)))}`;
    return `${fromLabel} – ${formatDateShortID(to)}`;
  }
  return `${a.day} – ${formatDateShortID(to)}`;
}

/** "Rentang 25 Jul – 5 Agu 2026 · 12 hari" — caption for a range-scoped figure. */
export function formatRangeNoteID(from: string, to: string, days: number): string {
  return `Rentang ${formatDateRangeID(from, to)} · ${days} hari`;
}

/** "25/7" — chart tick for a business date. */
export function formatDayMonthID(isoDate: string): string {
  const { month, day } = parseISODate(isoDate);
  return `${day}/${month}`;
}
