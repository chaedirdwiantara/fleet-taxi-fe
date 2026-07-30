// Grab pivot — key is composite `plate|city|driver` (brief §2.A). Display only.

export type GrabRow = {
  compositeKey: string;
  plateNumber: string;
  city: string;
  driverName: string;
  rentalPartner: string;
  tiering: string;
  vehicleType: string;
  driverPhone: string;
  // Mirror of the plate view's single driver: the plates behind this row (its
  // own in plate mode, all of them in driver mode). Optional so the grid
  // tolerates a backend that predates the field.
  plateHistory?: { plate: string; city: string }[];
  days: Record<number, { earning: number } | undefined>;
  summary: {
    earning: number;
    incentive: number;
    driverFare: number;
    tollAndOthers: number;
    rides: number;
    onlineHours: number;
    bookings: number;
    cancellations: number;
    cancellationRate: number;
    fulfillmentRate: number;
  };
};

export type GrabGrid = {
  month: number;
  year: number;
  daysInMonth: number;
  rows: GrabRow[];
  totals: { earning: number; driverFare: number; incentive: number };
  availableRentalPartners: string[];
  availableCities: string[];
};

// Whole-month performance detail (legacy "eye" modal).
export type GrabDriverDetail = {
  compositeKey: string;
  driverName: string;
  plateNumber: string;
  phone: string;
  onlineHours: number;
  bookings: number;
  rides: number;
  cancelByDriver: number;
  fulfillmentRate: number;
  cancellationRate: number;
  fare: number;
  toll: number;
  incentive: number;
  earning: number;
};

// Grab dashboard summary (cards + charts), admin and partner alike; shape
// mirrors the Gojek summary's charts so FleetChartsPanel is reused as-is.
export type GrabSummary = {
  globalSummary: {
    totalEarning: number;
    totalDriverFare: number;
    totalIncentive: number;
    totalRides: number;
    activeVehicles: number;
  };
  // Present only when the request carried ?dateFrom&dateTo (Tanggal filter):
  // the same figures narrowed to that range, which may cross months.
  range?: GrabRangeSummary;
  charts: {
    daily: { day: number; total: number }[];
    byPartner: { partner: string; total: number }[];
  };
  availableRentalPartners: string[];
  lastImportDate: string | null;
};

export type GrabRangeSummary = {
  fromDate: string; // YYYY-MM-DD
  toDate: string;
  days: number;
  totalEarning: number;
  totalDriverFare: number;
  totalIncentive: number;
  totalRides: number;
  activeVehicles: number;
  charts: {
    daily: { date: string; total: number }[];
    byPartner: { partner: string; total: number }[];
  };
};
