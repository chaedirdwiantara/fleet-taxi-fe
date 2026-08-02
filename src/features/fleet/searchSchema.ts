import { z } from 'zod';
import {
  currentMonthWIB,
  currentYearWIB,
  daysInRangeISO,
  type DateRangeValue,
} from '@/lib/datetime';

/** Mirrors the backend's MAX_RANGE_DAYS — beyond it the API answers 400. */
export const MAX_RANGE_DAYS = 92;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Typed, zod-validated search params for both fleet grids (kickoff §4).
// The whole grid state lives in the URL: shareable, back-button friendly,
// and it keys the Query cache directly.
export const fleetSearchSchema = z.object({
  month: z
    .number()
    .int()
    .min(1)
    .max(12)
    .catch(() => currentMonthWIB()),
  year: z
    .number()
    .int()
    .min(2020)
    .max(2100)
    .catch(() => currentYearWIB()),
  rentalPartner: z.array(z.string()).catch([]),
  // Tanggal filter (summary + charts only); absent = whole selected month. The
  // range may cross months, so it is dates rather than days-of-month. Coherence
  // between the two is checked by normalizeRange at the call site.
  dateFrom: z.string().regex(ISO_DATE).optional().catch(undefined),
  dateTo: z.string().regex(ISO_DATE).optional().catch(undefined),
  // Table filters (TableFilterBar), applied server-side. They narrow the pivot
  // ONLY — the summary cards and charts come from the summary endpoint and
  // describe the whole fleet on purpose.
  // `q` supersedes the old plate-only `plate` param: it matches a plate OR a
  // driver name, so one box covers both ways a reader knows a row.
  q: z.string().optional().catch(undefined),
  vehicleType: z.array(z.string()).catch([]),
  // "<plateNorm|compositeKey>:<day>" → deep-linkable day-breakdown modal
  cell: z.string().optional().catch(undefined),
  // Row subject of the pivot: one row per plate (default) or per driver. It
  // lives in the URL — not in component state — because the server returns
  // genuinely different rows and the link should stay shareable.
  mode: z.enum(['plate', 'driver']).catch('plate'),
});

export type FleetSearch = z.infer<typeof fleetSearchSchema>;

/**
 * The date range a hand-editable URL actually asks for, or `undefined` for
 * "whole month". Drops anything the API would reject (half a pair, inverted
 * bounds, an over-long span) instead of sending it and rendering an error.
 */
export function normalizeRange(
  dateFrom: string | undefined,
  dateTo: string | undefined,
): DateRangeValue | undefined {
  if (!dateFrom || !dateTo) return undefined;
  if (dateFrom > dateTo) return undefined;
  if (daysInRangeISO(dateFrom, dateTo) > MAX_RANGE_DAYS) return undefined;
  return { dateFrom, dateTo };
}

/** Row subject of a monitoring pivot — mirrors the backend's `mode` param. */
export type MonitoringMode = FleetSearch['mode'];

/** Parse the `cell` param; null when absent or malformed. */
export function parseCellParam(cell: string | undefined): { key: string; day: number } | null {
  if (!cell) return null;
  const idx = cell.lastIndexOf(':');
  if (idx <= 0) return null;
  const key = cell.slice(0, idx);
  const day = Number(cell.slice(idx + 1));
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  return { key, day };
}

export function makeCellParam(key: string, day: number): string {
  return `${key}:${day}`;
}
