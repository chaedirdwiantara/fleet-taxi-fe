// All Fleet Monitoring mocks. Deliberately built the same way the backend builds
// it (partner-portal/all-fleet-matrix.ts): take the figures the Gojek, Grab and
// Rental fixtures already produce and only REGROUP them, so the mock cannot
// promise a shape or an invariant the real endpoint does not honor.
import type { MonitoringMode } from '@/features/fleet/searchSchema';
import { daysInMonth } from './fleet';
import type { SeedRental } from './rental';

type SourceKey = 'gojek' | 'grab' | 'rental';

/** The Gojek grid's own per-day facts, exactly as its fixture emits them. */
type GojekDayFacts = {
  displayAmount: number;
  countedAmount: number;
  isManualPayment?: boolean;
  hasDisplayOnlyManualPayment?: boolean;
  isMixed?: boolean;
  exception?: { isBebasSetoran: boolean; keterangan: string | null } | null;
};

/**
 * Mirror of the backend's AllFleetGojekDay: the same facts plus the day's target,
 * which lives on the ROW in the Gojek grid and has to travel with the cell here.
 * Presentation only — never summed.
 */
export type MockGojekDay = GojekDayFacts & { dailyTarget: number };

export type MockAllFleetCell = {
  gojek: number;
  grab: number;
  rental: number;
  total: number;
  isZero: boolean;
  gojekDay?: MockGojekDay;
};
export type MockAllFleetRow = {
  key: string;
  label: string;
  sublabel: string | null;
  history: { label: string; sublabel: string | null; fromDay: number; toDay: number }[];
  days: Record<number, MockAllFleetCell>;
  totals: { gojek: number; grab: number; rental: number; total: number };
};

/** Minimal shapes this builder needs from the platform fixtures. */
type GojekLike = {
  daysInMonth: number;
  rows: {
    plateNorm: string;
    plateRaw: string;
    driverName: string;
    vehicleType: string;
    driverHistory: string[];
    plateHistory?: string[];
    dailyTarget: number;
    dailyDue?: Record<number, number | undefined>;
    days: Record<number, GojekDayFacts | undefined>;
  }[];
};
type GrabLike = {
  rows: {
    compositeKey: string;
    plateNumber: string;
    city: string;
    driverName: string;
    vehicleType: string;
    plateHistory?: { plate: string; city: string }[];
    days: Record<number, { earning: number } | undefined>;
  }[];
};

const emptyCell = (): MockAllFleetCell => ({
  gojek: 0,
  grab: 0,
  rental: 0,
  total: 0,
  isZero: false,
});
const emptyTotals = () => ({ gojek: 0, grab: 0, rental: 0, total: 0 });

function addDay(row: MockAllFleetRow, source: SourceKey, day: number, amount: number) {
  const cell = (row.days[day] ??= emptyCell());
  cell[source] += amount;
  cell.total += amount;
  row.totals[source] += amount;
  row.totals.total += amount;
}

function trackHistory(
  row: MockAllFleetRow,
  label: string,
  sublabel: string | null,
  days: number[],
) {
  if (!label || days.length === 0) return;
  const from = Math.min(...days);
  const to = Math.max(...days);
  const seen = row.history.find((h) => h.label === label);
  if (seen) {
    seen.fromDay = Math.min(seen.fromDay, from);
    seen.toDay = Math.max(seen.toDay, to);
    if (!seen.sublabel && sublabel) seen.sublabel = sublabel;
    return;
  }
  row.history.push({ label, sublabel, fromDay: from, toDay: to });
}

/** Per-day rupiah of one rental booking, clipped to the month — the same rule as
 * the backend's rentalBookingDays (price/day every day, additionalCost once). */
function rentalBookingDays(
  rental: SeedRental,
  month: number,
  year: number,
): Record<number, number> {
  const mm = String(month).padStart(2, '0');
  const dim = daysInMonth(month, year);
  const start = `${year}-${mm}-01`;
  const end = `${year}-${mm}-${String(dim).padStart(2, '0')}`;
  const from = rental.startDate < start ? start : rental.startDate;
  const to = rental.endDate > end ? end : rental.endDate;
  if (to < from) return {};

  const days: Record<number, number> = {};
  const firstDay = Number(from.slice(8, 10));
  const lastDay = Number(to.slice(8, 10));
  for (let day = firstDay; day <= lastDay; day++) {
    days[day] = rental.pricePerDay + (day === firstDay ? rental.additionalCost : 0);
  }
  return days;
}

const normalizePlate = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function makeAllFleetGrid(
  month: number,
  year: number,
  mode: MonitoringMode,
  sources: { gojek: GojekLike; grab: GrabLike; rentals: SeedRental[] },
) {
  const byDriver = mode === 'driver';
  const dim = daysInMonth(month, year);
  const rows = new Map<string, MockAllFleetRow>();
  const residual: MockAllFleetRow = {
    key: 'residual',
    label: byDriver ? 'Tanpa driver' : 'Tanpa plat',
    sublabel: null,
    history: [],
    days: {},
    totals: emptyTotals(),
  };
  let hasResidual = false;

  const target = (key: string, label: string, sublabel: string | null) => {
    if (!label) {
      hasResidual = true;
      return residual;
    }
    const existing = rows.get(key);
    if (existing) {
      if (!existing.sublabel && sublabel) existing.sublabel = sublabel;
      return existing;
    }
    const created: MockAllFleetRow = {
      key,
      label,
      sublabel,
      history: [],
      days: {},
      totals: emptyTotals(),
    };
    rows.set(key, created);
    return created;
  };

  for (const gojekRow of sources.gojek.rows) {
    const key = byDriver ? `drv:${gojekRow.driverName.toUpperCase()}` : gojekRow.plateNorm;
    const label = byDriver ? gojekRow.driverName.toUpperCase() : gojekRow.plateNorm;
    const row = target(key, label, byDriver ? null : gojekRow.vehicleType || null);
    const activeDays: number[] = [];
    for (const [dayKey, cell] of Object.entries(gojekRow.days)) {
      const day = Number(dayKey);
      if (day > dim || !cell) continue;
      // A day the import never mentioned (exception only) is NOT "in the data,
      // Rp 0" — the backend derives zeroDays from dailyCountedData, which such a
      // day never enters.
      const importedNothing = !!cell.exception && cell.displayAmount === 0;
      if (cell.countedAmount === 0) {
        (row.days[day] ??= emptyCell()).isZero = !importedNothing;
      } else {
        addDay(row, 'gojek', day, cell.countedAmount);
        activeDays.push(day);
      }
      // Gojek's verdict rides along on every day it reported — including the
      // moneyless ones (bebas setoran, display-only Manual Payment), which is
      // what makes them visible here at all. Never summed; see the backend's
      // attachGojekDays.
      const { isManualPayment, hasDisplayOnlyManualPayment, isMixed, exception } = cell;
      row.days[day]!.gojekDay = {
        displayAmount: cell.displayAmount,
        countedAmount: cell.countedAmount,
        dailyTarget: gojekRow.dailyDue?.[day] ?? gojekRow.dailyTarget,
        ...(isManualPayment ? { isManualPayment } : {}),
        ...(hasDisplayOnlyManualPayment ? { hasDisplayOnlyManualPayment } : {}),
        ...(isMixed ? { isMixed } : {}),
        exception: exception ?? null,
      };
    }
    const history = byDriver
      ? (gojekRow.plateHistory ?? [])
      : gojekRow.driverHistory.map((d) => d.toUpperCase());
    for (const label of history) trackHistory(row, label, null, activeDays);
  }

  for (const grabRow of sources.grab.rows) {
    const key = byDriver ? `drv:${grabRow.driverName.toUpperCase()}` : grabRow.plateNumber;
    const label = byDriver ? grabRow.driverName.toUpperCase() : grabRow.plateNumber;
    const row = target(key, label, byDriver ? null : grabRow.vehicleType || null);
    const activeDays: number[] = [];
    for (const [dayKey, cell] of Object.entries(grabRow.days)) {
      const day = Number(dayKey);
      if (day > dim || !cell) continue;
      addDay(row, 'grab', day, cell.earning);
      activeDays.push(day);
    }
    if (byDriver) {
      for (const use of grabRow.plateHistory ?? []) {
        trackHistory(row, use.plate, use.city || null, activeDays);
      }
    } else {
      trackHistory(row, grabRow.driverName.toUpperCase(), grabRow.city || null, activeDays);
    }
  }

  for (const rental of sources.rentals) {
    const days = rentalBookingDays(rental, month, year);
    const dayNumbers = Object.keys(days).map(Number);
    if (dayNumbers.length === 0) continue;
    const norm = normalizePlate(rental.plateNumber);

    // Rental Monitoring records no driver → ownerless in driver mode.
    if (byDriver) {
      hasResidual = true;
      for (const day of dayNumbers) addDay(residual, 'rental', day, days[day]);
      trackHistory(residual, norm, rental.vehicleType, dayNumbers);
      continue;
    }
    const sublabel = [rental.vehicleType, rental.region].filter(Boolean).join(' · ') || null;
    const row = target(norm, rental.plateNumber, sublabel);
    for (const day of dayNumbers) addDay(row, 'rental', day, days[day]);
  }

  const sorted = [...rows.values()].sort(
    (a, b) => b.totals.total - a.totals.total || a.label.localeCompare(b.label),
  );

  const dailyTotals: Record<number, MockAllFleetCell> = {};
  const totals = emptyTotals();
  for (const row of [...sorted, ...(hasResidual ? [residual] : [])]) {
    for (const [dayKey, cell] of Object.entries(row.days)) {
      const agg = (dailyTotals[Number(dayKey)] ??= emptyCell());
      agg.gojek += cell.gojek;
      agg.grab += cell.grab;
      agg.rental += cell.rental;
      agg.total += cell.total;
    }
    totals.gojek += row.totals.gojek;
    totals.grab += row.totals.grab;
    totals.rental += row.totals.rental;
    totals.total += row.totals.total;
  }

  return {
    month,
    year,
    daysInMonth: dim,
    mode,
    rows: sorted,
    residual: hasResidual ? residual : null,
    dailyTotals,
    totals,
    subjectCount: sorted.length,
    activeCount: sorted.filter((r) => r.totals.total !== 0).length,
  };
}

/** Cell drill-down: the same per-source split the grid cell shows, as items. */
export function makeAllFleetCell(
  grid: ReturnType<typeof makeAllFleetGrid>,
  key: string,
  day: number,
) {
  const row = key === 'residual' ? grid.residual : (grid.rows.find((r) => r.key === key) ?? null);
  const cell = row?.days[day];
  if (!row || !cell || cell.total === 0) return null;

  const sources = (['gojek', 'grab', 'rental'] as SourceKey[])
    .filter((source) => cell[source] !== 0)
    .map((source) => ({
      source,
      total: cell[source],
      items: [
        {
          label:
            source === 'gojek'
              ? 'GoPay Deduction'
              : source === 'grab'
                ? row.label
                : 'Transaksi rental',
          sublabel: row.sublabel,
          amount: cell[source],
          note: null as string | null,
        },
      ],
    }));

  return {
    key,
    label: row.label,
    date: `${grid.year}-${String(grid.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    total: cell.total,
    sources,
  };
}
