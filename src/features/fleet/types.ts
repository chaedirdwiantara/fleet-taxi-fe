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
  days: Record<number, DayCellValue | undefined>; // sparse map keyed by day
  summary: {
    totalDeduction: number;
    calculatedTarget: number; // "Total Due (Target)"
    gap: number; // totalDeduction - calculatedTarget
    outstanding: number; // headline all-time number
  };
  driverHistory: string[];
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
    outstanding: number;
  };
  availableRentalPartners: string[];
  availablePlates: { plate: string; type: string }[];
};

// Cell-click breakdown (brief §2.A: display vs counted totals).
export type CellBreakdownItem = {
  label: string; // e.g. "Deduction", "Manual Payment"
  displayAmount: number;
  countedAmount: number;
  note: string | null;
  isDisplayOnly: boolean; // manual "tidak masuk setoran"
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
  totalOutstanding: number; // Total Outstanding / Gap
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

export type Performer = {
  key: string;
  driverName: string;
  vehicle: string;
  totalDeduction: number;
  outstanding: number;
};

export type Performers = { top: Performer[]; bottom: Performer[] };
