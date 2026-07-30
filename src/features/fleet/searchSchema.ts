import { z } from 'zod';
import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';

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
  // Tanggal filter (dashboard summary only); undefined = whole month. Values
  // beyond the selected month's length are guarded at the call site.
  day: z.number().int().min(1).max(31).optional().catch(undefined),
  plate: z.string().optional().catch(undefined),
  // "<plateNorm|compositeKey>:<day>" → deep-linkable day-breakdown modal
  cell: z.string().optional().catch(undefined),
  // Row subject of the pivot: one row per plate (default) or per driver. It
  // lives in the URL — not in component state — because the server returns
  // genuinely different rows and the link should stay shareable.
  mode: z.enum(['plate', 'driver']).catch('plate'),
});

export type FleetSearch = z.infer<typeof fleetSearchSchema>;

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
