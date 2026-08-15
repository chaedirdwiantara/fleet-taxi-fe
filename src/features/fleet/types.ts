// Client data model for the Gojek fleet grid — DISPLAY ONLY (kickoff §5).
// Every rupiah figure + cell flag is backend-computed; the client never sums,
// prorates, or re-derives money. Shapes mirror the legacy evista-backend
// AdminFleetMonitoringController output so the grid renders identically.
import type { DayFacts } from './lib/thresholds';

export type DayCellValue = DayFacts & {
  day: number; // 1..31 (Asia/Jakarta calendar day)
  detail?: CellBreakdown | null; // preloaded breakdown for the modal
};

export type FleetRow = {
  plateNorm: string; // join/pivot key (backend-normalized [A-Z0-9])
  plateRaw: string; // "vehicle" in legacy
  driverName: string;
  rentalPartner: string;
  regionName: string;
  vehicleType: string;
  deliveryBatch: string;
  carId: number | null; // null → "Set Target", else "Edit Detail & Target"
  // Set only for "Manual Payment tanpa plat" rows (pivot key manual_<detailId>):
  // the fleet_import_details.id so the Edit form can re-plate / toggle setoran.
  detailId: number | null;
  dailyTarget: number; // "Setoran" column (inferred or fleet_target)
  // Per-day due amounts + their backend-computed ranges. When the target
  // changed mid-month (>1 segment) the Setoran column lists each value with
  // its active days; dailyDue is also the per-day cell-tone baseline.
  dailyDue: Record<number, number | undefined>;
  dueSegments: DueSegment[];
  days: Record<number, DayCellValue | undefined>; // sparse map keyed by day
  summary: {
    totalDeduction: number;
    // "Total Due (Target)": Σ of the due rows actually imported this month.
    // Days that have not elapsed, were never imported, or predate the plate's
    // first billing are not charged.
    calculatedTarget: number;
    gap: number; // totalDeduction - calculatedTarget
    // The span calculatedTarget covers, so the cell can explain the figure.
    // Optional: a backend that predates the field simply renders no caption.
    billedDays?: number;
    billFromDay?: number | null;
    billToDay?: number | null;
    // "Outstanding Total": cumulative Σdue − Σpaid from the plate's first
    // imported row up to the END of the selected month (negative = credit).
    outstanding: number;
    // "Outstanding Bln Ini": the selected month's own delta. Optional so the
    // grid tolerates a backend that predates the field (FE-ahead deploy window).
    outstandingMonth?: number;
  };
  // "Rincian Outstanding": what the cumulative balance is made of. Optional —
  // only the admin grid requests it, and a backend that predates the field
  // simply leaves the cell unopenable.
  outstandingBreakdown?: OutstandingBreakdown;
  driverHistory: string[];
  // Mirror of driverHistory: the plates behind this row. Plate mode → its own
  // plate; driver mode → every plate the person drove that month. Optional so
  // the grid tolerates a backend that predates the field.
  plateHistory?: string[];
  // Driver keluar: plate stopped appearing in imports (auto-clears when it
  // reappears). exitedLastSeen = last import date it was seen (YYYY-MM-DD).
  isExited: boolean;
  exitedLastSeen: string | null;
  // Plate first appeared inside the selected month, so a smaller Total Due
  // reflects a shorter month rather than underpayment. Optional for the same
  // deploy-window reason as above.
  isNewJoiner?: boolean;
  joinDate?: string | null; // YYYY-MM-DD of its first imported transaction
};

// One Setoran target value and the day range it was active (backend RLE).
export type DueSegment = { amount: number; fromDay: number; toDay: number };

// ---- "Rincian Outstanding" -------------------------------------------------
// Outstanding Total is an all-history figure, so on its own it cannot be
// checked: a plate whose current driver is fully settled still looks indebted
// because it carries what earlier drivers left behind. The backend therefore
// ships the same balance read two ways — per contributor and per month — and
// the cell opens them. Every figure is backend-computed; the client formats.

// One contributor: the OPPOSITE identity of the row — a driver on a plate row,
// a plate on a driver row.
export type OutstandingPart = {
  label: string;
  due: number;
  paid: number;
  delta: number; // due − paid; negative = this contributor overpaid
  from: string; // YYYY-MM-DD of its first transaction
  to: string;
};

export type OutstandingMonth = {
  ym: string; // YYYY-MM
  due: number;
  paid: number;
  delta: number;
  balance: number; // running balance after this month
};

export type OutstandingBreakdown = {
  parts: OutstandingPart[]; // chronological
  months: OutstandingMonth[]; // chronological
  total: number; // equals summary.outstanding
  contributorCount: number; // contributors that left a remainder
  // Span of months that actually moved the balance — the cell's caption.
  rangeFrom: string | null; // YYYY-MM
  rangeTo: string | null;
};

// "Data Mentah Tanpa Plat": an unprocessed Manual Payment imported without a
// plate. Lives outside the pivot/summary until an admin processes it (assigns
// a plate + status setoran via edit-driver), then merges into its plate's row.
export type RawManualRow = {
  detailId: number;
  transactionDate: string; // YYYY-MM-DD
  driverName: string;
  amount: number;
  isManualPaymentSetoran: number | null;
  note: string | null;
};

export type FleetGrid = {
  month: number;
  year: number;
  daysInMonth: number;
  rows: FleetRow[];
  dailyTotals: Record<number, number>; // "TOTAL HARI INI" per day
  tableTotals: {
    totalDeduction: number;
    totalDue: number;
    outstanding: number; // Outstanding Total (cumulative ≤ selected month)
    outstandingMonth?: number; // Outstanding Bln Ini (optional: older backend)
  };
  // Admin processing queue — always empty on the partner surface (an unplated
  // row can never match the partner's plate scope). Optional: older backend.
  rawRows?: RawManualRow[];
  rawTotalAmount?: number;
  availableRentalPartners: string[];
  // Per-plate Type, resolved server-side. Populated in BOTH modes, so the
  // driver view can label each plate a person drove ("B2449SNC - BYD M6").
  availablePlates: { plate: string; type: string }[];
  // Options of the Tipe Kendaraan filter. Optional so the grid tolerates a
  // backend that predates the field (FE-ahead deploy window).
  availableVehicleTypes?: string[];
};

// Cell-click breakdown (brief §2.A: display vs counted totals).
export type CellBreakdownItem = {
  label: string; // e.g. "Deduction", "Manual Payment"
  displayAmount: number;
  countedAmount: number;
  note: string | null;
  isDisplayOnly: boolean; // manual "tidak masuk setoran"
  // Backing fleet_import_details ids — non-empty for Manual Payment items, so
  // the admin modal can re-open each one in the Edit form (re-toggle setoran).
  detailIds?: number[];
};

export type CellBreakdown = {
  plateNorm: string;
  day: number;
  displayTotal: number;
  countedTotal: number;
  hasDisplayOnlyManualPayment: boolean;
  items: CellBreakdownItem[];
};

// ---- Admin dashboard aggregates (separate from the monitoring table) --------

export type GlobalSummary = {
  totalDeduction: number; // Total Setoran
  totalDue: number; // Total Target (Due)
  // Total Outstanding / Gap: cumulative up to the selected month (active plates)
  totalOutstanding: number;
  // The selected month's delta of that balance. Optional: older backend.
  totalOutstandingMonth?: number;
  outstandingDriverKeluar: number; // balance of plates gone from imports
  exitedCount: number; // exited plates that still owe (non-zero balance)
};

// Click-through detail of the Outstanding Driver Keluar card: one row per
// non-zero-balance exited plate, outstanding descending (backend-sorted).
export type ExitedDriver = {
  driverName: string;
  plate: string;
  lastSeen: string; // YYYY-MM-DD of the plate's last import row
  outstanding: number;
};

export type FleetCharts = {
  daily: { day: number; total: number }[]; // setoran per hari
  byPartner: { partner: string; total: number }[]; // setoran per rental partner
};

export type InactiveDriver = { name: string; status: string; vehicle: string };

export type DriverActivity = {
  day: number;
  availableDays: number[];
  maxDayInData: number;
  activeDrivers: number;
  inactiveDrivers: number;
  selectedDayTotalDeduction: number;
  inactiveList: InactiveDriver[];
};

// Tanggal-filter aggregates (present only when the summary was requested with
// ?dateFrom&dateTo). `totalDeduction`/`totalDue` are PERIOD figures — what the
// range itself collected and billed. `outstandingAsOf` is a BALANCE, read at the
// range's closing date, and `outstandingDelta` is the range's own contribution
// to it. A range covering one full month equals that month's GlobalSummary.
export type RangeSummary = {
  fromDate: string; // YYYY-MM-DD
  toDate: string;
  days: number;
  totalDeduction: number;
  totalDue: number;
  outstandingAsOf: number;
  outstandingDelta: number;
  charts: {
    daily: { date: string; total: number }[];
    byPartner: { partner: string; total: number }[];
  };
};
