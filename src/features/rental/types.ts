// Rental Monitoring domain (partner portal): the partner's own rental
// transactions for a WIB month. ALL money fields are integer rupiah and
// ALL derived amounts (gross/cogsTotal/nettProfit/omset + summary) are
// computed by the backend — the FE only formats them for display.

export type PaymentStatus = 'Belum Dibayar' | 'Sudah Dibayar';
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
  gross: number;
  cogsTotal: number;
  nettProfit: number;
  omset: number;
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
};

export type CogsDefault = {
  key: string;
  label: string;
  cogsPerDay: number;
};
