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

// Admin Grab dashboard summary (cards + charts); shape mirrors the Gojek
// summary's charts so FleetChartsPanel is reused as-is.
export type GrabSummary = {
  globalSummary: {
    totalEarning: number;
    totalDriverFare: number;
    totalIncentive: number;
    totalRides: number;
    activeVehicles: number;
  };
  charts: {
    daily: { day: number; total: number }[];
    byPartner: { partner: string; total: number }[];
  };
  availableRentalPartners: string[];
  lastImportDate: string | null;
};
