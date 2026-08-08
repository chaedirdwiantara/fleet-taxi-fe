// Rental Monitoring domain (partner portal): the partner's own rental
// transactions for a WIB month. ALL money fields are integer rupiah and
// ALL derived amounts (gross/cogsTotal/nettProfit/omset + summary) are
// computed by the backend — the FE only formats them for display.

export type PaymentStatus = 'Belum Dibayar' | 'Sudah Dibayar';

/**
 * One payment-evidence file. `uploadedBy*` is the backend's snapshot of who
 * uploaded it — displayed as-is, never re-derived from the current session.
 */
export type RentalPaymentProof = {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: 'pending' | 'uploaded';
  /** Present for uploaded proofs only (presigned S3 GET in prod). */
  url?: string;
  uploadedByName: string | null;
  uploadedByEmail: string;
  uploadedAt: string;
};
export type RentalType = 'Dengan Driver' | 'Lepas Kunci';
export type RentalSortBy = 'date' | 'duration' | 'status' | 'omset' | 'cogs';
export type RentalSortOrder = 'asc' | 'desc';

export type RentalItem = {
  id: number;
  plateNumber: string;
  vehicleType: string | null;
  region: string | null;
  startDate: string; // YYYY-MM-DD (full rental range)
  endDate: string;
  displayStartDate: string; // range clipped to the requested month
  displayEndDate: string;
  days: number;
  pricePerDay: number;
  cogsPerDay: number;
  cogsType: string | null;
  additionalCost: number;
  additionalCostDescription: string | null;
  deposit: number;
  rentalType: RentalType | null;
  infoSource: string | null;
  serviceArea: string | null;
  customerName: string | null;
  customerPhone: string | null;
  paymentStatus: PaymentStatus;
  /** Non-empty for every 'Sudah Dibayar' row — the BE refuses paid without it. */
  paymentProofs: RentalPaymentProof[];
  gross: number;
  cogsTotal: number;
  nettProfit: number;
  omset: number;
  /** VAT rate captured when the row was written; 0 = not taxed. */
  ppnRateBps: number;
  /** DPP — gross + additionalCost, the base PPN is charged on. */
  ppnBase: number;
  ppnAmount: number;
  /** What the customer pays: ppnBase + ppnAmount. */
  totalBilled: number;
  createdAt: string;
  updatedAt: string;
};

export type RentalSummary = {
  totalTransactions: number;
  unpaidTransactions: number;
  unpaidGross: number;
  paidGross: number;
  paidCogs: number;
  paidAdditionalCost: number;
  paidNettProfit: number;
  /** VAT owed to the state on paid rows — reported apart from revenue. */
  paidPpn: number;
  paidTotalBilled: number;
  unpaidPpn: number;
};

/** Per-partner VAT posture; only a PKP may charge PPN. */
export type RentalTaxSettings = {
  isPkp: boolean;
  npwp: string | null;
  /** Rate new rentals get — 0 while not PKP. */
  ppnRateBps: number;
  /** Statutory rate, so the UI never hardcodes 11%. */
  statutoryRateBps: number;
};

export type RentalNettByType = {
  cogsType: string;
  gross: number;
  cogs: number;
  nett: number;
  count: number;
};

export type RentalListData = {
  summary: RentalSummary;
  nettByType: RentalNettByType[];
  regions: string[];
  items: RentalItem[];
};

export type RentalListParams = {
  month: number;
  year: number;
  region?: string;
  search?: string;
  sortBy: RentalSortBy;
  sortOrder: RentalSortOrder;
};

/** POST/PUT body — `price` is per `priceUnit`; the BE derives pricePerDay. */
export type RentalUpsertInput = {
  plateNumber: string;
  vehicleType?: string;
  region?: string;
  startDate: string;
  endDate: string;
  price: number;
  priceUnit: 'hari' | 'bulan';
  cogsPerDay: number;
  cogsType?: string;
  additionalCost?: number;
  additionalCostDescription?: string;
  deposit?: number;
  rentalType?: RentalType;
  infoSource?: string;
  serviceArea?: string;
  customerName?: string;
  customerPhone?: string;
  paymentStatus?: PaymentStatus;
  /** Confirmed proof ids to attach; required when paymentStatus is paid. */
  paymentProofIds?: number[];
};

export type CogsDefault = {
  key: string;
  label: string;
  cogsPerDay: number;
};

// ---- Rental Monitoring pivot (plate × day) ----------------------------------
// The same transactions as the list above, read as a calendar: which car earned
// on which day, and whether that money has been collected. Every figure is
// backend-spread (partner-rentals/rental-grid.ts); the FE only formats.

export type RentalGridTotals = {
  omset: number;
  cogs: number;
  nett: number;
  /** Calendar days of the month the plate was under a booking. */
  rentedDays: number;
};

export type RentalGridDayCell = {
  amount: number;
  paymentStatus: PaymentStatus;
  /** The booking this day belongs to — the key to its row in `bookings`. */
  rentalId: number;
};

/** One booking's contribution to the month, for the cell drill-down. */
export type RentalGridBooking = {
  id: number;
  customerName: string | null;
  /** Range clipped to the selected month — what the row's cells cover. */
  displayStartDate: string;
  displayEndDate: string;
  days: number;
  omset: number;
  cogsTotal: number;
  nettProfit: number;
  paymentStatus: PaymentStatus;
  rentalType: RentalType | null;
};

export type RentalGridRow = {
  plateNorm: string;
  plateNumber: string;
  vehicleType: string | null;
  region: string | null;
  /** Sparse: only days covered by a booking appear. */
  days: Record<number, RentalGridDayCell | undefined>;
  bookings: RentalGridBooking[];
  totals: RentalGridTotals;
};

export type RentalGrid = {
  month: number;
  year: number;
  daysInMonth: number;
  rows: RentalGridRow[];
  dailyTotals: Record<number, number | undefined>;
  totals: RentalGridTotals;
  /** Rows in the table, and how many were rented at least one day. */
  plateCount: number;
  activeCount: number;
};
