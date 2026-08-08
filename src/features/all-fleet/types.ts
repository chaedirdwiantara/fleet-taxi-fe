// Client model for All Fleet Monitoring — DISPLAY ONLY. Every rupiah figure and
// every per-source split is backend-computed (partner-portal/all-fleet-matrix.ts);
// the client never sums, prorates, or re-derives money.
import type { DayFacts } from '@/features/fleet/lib/thresholds';
import type { MonitoringMode } from '@/features/fleet/searchSchema';

export const ALL_FLEET_SOURCES = ['gojek', 'grab', 'rental'] as const;
export type AllFleetSource = (typeof ALL_FLEET_SOURCES)[number];

/**
 * Gojek's verdict on the day, exactly as Gojek Monitoring receives it, plus that
 * day's target. Feeding it to the same `cellTone()` is what lets this grid wear
 * the same status legend without owning a second copy of the rules.
 * PRESENTATION ONLY — the money of the cell is `gojek`/`total` below.
 */
export type AllFleetGojekDay = DayFacts & { dailyTarget: number };

export type AllFleetDayCell = {
  gojek: number;
  grab: number;
  rental: number;
  total: number;
  /** Subject is present in that day's data but earned Rp 0 — distinct from "no data". */
  isZero: boolean;
  /** Absent on Grab/Rental-only days: they have no daily target to be judged on. */
  gojekDay?: AllFleetGojekDay;
};

/** Mirror subject of the row: drivers of a plate, or plates of a driver. */
export type AllFleetHistoryEntry = {
  label: string;
  sublabel: string | null; // vehicle type / city when known
  fromDay: number;
  toDay: number;
};

export type AllFleetTotals = { gojek: number; grab: number; rental: number; total: number };

export type AllFleetRow = {
  /** Normalized plate, `drv:<NAME>`, or `residual` for the unattributed row. */
  key: string;
  label: string;
  sublabel: string | null;
  history: AllFleetHistoryEntry[];
  /** Sparse: only days with data are present. */
  days: Record<number, AllFleetDayCell | undefined>;
  totals: AllFleetTotals;
};

export type AllFleetGrid = {
  month: number;
  year: number;
  daysInMonth: number;
  mode: MonitoringMode;
  rows: AllFleetRow[];
  /**
   * Income no subject owns — "Tanpa driver" (all Rental omset, plus import rows
   * without a driver name) or "Tanpa plat". Its amounts ARE part of `totals`.
   */
  residual: AllFleetRow | null;
  dailyTotals: Record<number, AllFleetDayCell | undefined>;
  totals: AllFleetTotals;
  subjectCount: number;
  activeCount: number;
};

// ---- cell drill-down --------------------------------------------------------

export type AllFleetCellItem = {
  label: string;
  sublabel: string | null;
  amount: number;
  note: string | null;
};

export type AllFleetCellSource = {
  source: AllFleetSource;
  total: number;
  items: AllFleetCellItem[];
};

export type AllFleetCell = {
  key: string;
  label: string;
  date: string; // YYYY-MM-DD
  total: number;
  /** Only sources with something on that day, Gojek → Grab → Rental. */
  sources: AllFleetCellSource[];
};
