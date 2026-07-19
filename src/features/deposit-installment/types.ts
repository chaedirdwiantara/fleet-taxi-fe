// Cicilan Deposit — API row/entry shapes returned by the BE (kept in lockstep
// manually with BE src/deposit-installments/installment-presenter.ts; the
// envelope is untyped in the generated schema, so the casts in hooks.ts are
// intentional). All money is integer rupiah computed server-side.

export type InstallmentStatus = 'berjalan' | 'lunas';

export interface InstallmentRule {
  id: number;
  title: string;
  driverName: string;
  lastPlate: string | null;
  installmentAmount: number;
  installmentCount: number;
  minDailySetoran: number | null;
  effectiveDate: string; // 'YYYY-MM-DD'
  note: string | null;
  createdAt: string; // ISO timestamp
  paidCount: number;
  totalPaid: number;
  totalTarget: number;
  remaining: number;
  status: InstallmentStatus;
  lastInstallmentDate: string | null;
}

export interface InstallmentEntry {
  seq: number;
  date: string; // 'YYYY-MM-DD'
  amount: number;
  dailySetoran: number;
}

export interface InstallmentRecap {
  rule: InstallmentRule;
  installments: InstallmentEntry[];
}

export interface DriverOption {
  driverName: string;
  lastPlate: string;
}

export const INSTALLMENT_SORT_FIELDS = [
  'title',
  'createdAt',
  'effectiveDate',
  'driverName',
  'installmentAmount',
  'installmentCount',
  'totalTarget',
  'totalPaid',
  'remaining',
] as const;
export type InstallmentSortField = (typeof INSTALLMENT_SORT_FIELDS)[number];
export type SortOrder = 'asc' | 'desc';

export interface InstallmentListParams {
  status?: InstallmentStatus;
  search?: string;
  sortBy: InstallmentSortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

/** Create/update payload (BE CreateDepositInstallmentDto). */
export interface InstallmentUpsertInput {
  title: string;
  driverName: string;
  installmentAmount: number;
  installmentCount: number;
  minDailySetoran?: number;
  effectiveDate: string;
  note?: string;
}
