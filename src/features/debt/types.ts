// The regenerated OpenAPI schema doesn't emit named response components for
// these payloads (the backend presenters return plain untyped envelopes), so
// the shapes live here. They mirror what portal-debt.service.ts / the debt
// presenter return — keep in lockstep manually. Money is integer rupiah.

export type DriverStatus = 'aktif' | 'nonaktif';

export type DebtRow = {
  driverName: string;
  cabang: string;
  koordinator: string;
  lastPlate: string;
  phone: string | null;
  status: DriverStatus;
  depositTerbayar: number;
  tagihanSetoran: number;
  tagihanEtle: number;
  tagihanOwnRisk: number;
  cicilanLainnya: number | null;
  totalTagihan: number;
  selisihDeposit: number;
};

export type DebtFilters = {
  cabang: string[];
  koordinator: string[];
};

export const DEBT_SORT_FIELDS = [
  'driverName',
  'cabang',
  'koordinator',
  'depositTerbayar',
  'tagihanSetoran',
  'totalTagihan',
  'selisihDeposit',
] as const;
export type DebtSortField = (typeof DEBT_SORT_FIELDS)[number];
export type SortOrder = 'asc' | 'desc';

/** Query params shared by the list + export endpoints. */
export interface DebtListParams {
  status?: DriverStatus;
  cabang?: string;
  koordinator?: string;
  search?: string;
  sortBy: DebtSortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}
