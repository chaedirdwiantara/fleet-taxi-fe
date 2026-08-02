// Cicilan — API row/entry shapes returned by the BE (kept in lockstep
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
  paidCount: number; // full installments covered: floor(totalPaid / installmentAmount)
  totalPaid: number;
  totalTarget: number;
  remaining: number;
  setoranArrears: number; // kekurangan setoran wajib yang terbawa (0 = tidak ada)
  status: InstallmentStatus;
  lastInstallmentDate: string | null;
}

/** One ledger day — days with amount 0 still appear (they explain arrears). */
export interface InstallmentEntry {
  seq: number; // hari ke-N di ledger (1-based)
  date: string; // 'YYYY-MM-DD'
  dailySetoran: number; // setoran hari itu
  obligation: number; // kewajiban wajib hari itu: min + tunggakan terbawa (0 di mode tetap)
  amount: number; // potongan cicilan hari itu (bisa sebagian, bisa 0)
  paidCumulative: number; // akumulasi cicilan SETELAH hari ini
  arrearsAfter: number; // kekurangan setoran wajib terbawa ke hari berikutnya
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

// ---- Car Ownership Program (COP) --------------------------------------------
// A COP row IS a cicilan rule whose title is the COP preset, so `CopRow` extends
// `InstallmentRule` — the shared components (InstallmentProgress, StatusBadge,
// RekapSheet) take one as-is. Mirrors BE src/deposit-installments/cop-presenter.ts.

/** Batas durasi cicilan (BE @Max) — COP 60 bulan = 60 × 30 = 1.800 cicilan. */
export const MAX_INSTALLMENT_COUNT = 3650;
/** Konvensi program: satu bulan tenor = 30 cicilan harian. */
export const COP_DAYS_PER_MONTH = 30;

export interface CopRow extends InstallmentRule {
  tenorMonths: number; // installmentCount ÷ 30, dibulatkan
  activeDays: number; // hari aktif yang sudah masuk ledger
  withdrawalCount: number; // berapa KALI uang benar-benar ditarik
  firstWithdrawalDate: string | null;
  scheduleDue: number; // yang seharusnya tertarik selama hari aktif itu
  scheduleGap: number; // scheduleDue − totalPaid; > 0 tertinggal, < 0 bayar di muka
}

export interface CopSummary {
  driverCount: number;
  ruleCount: number;
  berjalanCount: number;
  lunasCount: number;
  totalTarget: number;
  totalPaid: number;
  totalRemaining: number;
  totalGap: number; // hanya gap positif — baris bayar-di-muka tidak menutupi tunggakan
  totalWithdrawals: number;
}

export const COP_SORT_FIELDS = [
  'driverName',
  'effectiveDate',
  'createdAt',
  'totalTarget',
  'totalPaid',
  'remaining',
  'scheduleGap',
  'withdrawalCount',
] as const;
export type CopSortField = (typeof COP_SORT_FIELDS)[number];

export interface CopListParams {
  status?: InstallmentStatus;
  search?: string;
  sortBy: CopSortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}
