import type {
  CopListParams,
  CopRow,
  DriverOption,
  InstallmentEntry,
  InstallmentListParams,
  InstallmentRule,
  InstallmentUpsertInput,
} from '@/features/deposit-installment/types';
import { COP_DAYS_PER_MONTH } from '@/features/deposit-installment/types';

// Cicilan Deposit fixtures — installment rules + their derived history,
// mirroring the BE derivation: paid figures come from `entries`, never
// computed by the FE. Mutable store so create/update/delete tests work;
// resetInstallments() restores the seed between tests.

let nextId = 100;

interface StoredRule {
  id: number;
  title: string;
  driverName: string;
  lastPlate: string | null;
  installmentAmount: number;
  installmentCount: number;
  minDailySetoran: number | null;
  effectiveDate: string;
  note: string | null;
  createdAt: string;
  entries: InstallmentEntry[];
}

const seed = (): StoredRule[] => [
  {
    id: 1,
    title: 'Cicilan Deposit Driver Halim',
    driverName: 'AMIR YUN',
    lastPlate: 'B2448SNC',
    installmentAmount: 25_000,
    installmentCount: 20,
    minDailySetoran: 100_000,
    effectiveDate: '2026-07-01',
    note: 'Deposit 500.000',
    createdAt: '2026-07-01T03:00:00.000Z',
    entries: [
      // surplus mode (min 100.000): partial pay, a short day, then settle
      {
        seq: 1,
        date: '2026-07-02',
        dailySetoran: 150_000,
        obligation: 100_000,
        amount: 50_000,
        paidCumulative: 50_000,
        arrearsAfter: 0,
      },
      {
        seq: 2,
        date: '2026-07-03',
        dailySetoran: 90_000,
        obligation: 100_000,
        amount: 0,
        paidCumulative: 50_000,
        arrearsAfter: 10_000,
      },
      {
        seq: 3,
        date: '2026-07-05',
        dailySetoran: 135_000,
        obligation: 110_000,
        amount: 25_000,
        paidCumulative: 75_000,
        arrearsAfter: 0,
      },
    ],
  },
  {
    id: 2,
    title: 'Cicilan Deposit Suwanto',
    driverName: 'SUWANTO',
    lastPlate: 'B2991UNS',
    installmentAmount: 50_000,
    installmentCount: 2,
    minDailySetoran: null,
    effectiveDate: '2026-06-01',
    note: null,
    createdAt: '2026-06-01T03:00:00.000Z',
    entries: [
      // fixed mode (min null): full nominal per active day
      {
        seq: 1,
        date: '2026-06-02',
        dailySetoran: 90_000,
        obligation: 0,
        amount: 50_000,
        paidCumulative: 50_000,
        arrearsAfter: 0,
      },
      {
        seq: 2,
        date: '2026-06-03',
        dailySetoran: 80_000,
        obligation: 0,
        amount: 50_000,
        paidCumulative: 100_000,
        arrearsAfter: 0,
      },
    ],
  },
  {
    id: 3,
    title: 'Cicilan Deposit Erpan',
    driverName: 'ERPAN ERPIANA',
    lastPlate: 'B2446SNC',
    installmentAmount: 25_000,
    installmentCount: 20,
    minDailySetoran: null,
    effectiveDate: '2026-07-10',
    note: null,
    createdAt: '2026-07-10T03:00:00.000Z',
    entries: [],
  },
  // Car Ownership Program: 60 bulan × 30 hari × Rp 35.000 = Rp 63.000.000.
  // Surplus mode, so the daily deduction can fall short and leave a gap.
  {
    id: 4,
    title: 'COP (Car Ownership Program)',
    driverName: 'YULIUS BAMBANG TRIUTOMO',
    lastPlate: 'B2451SNC',
    installmentAmount: 35_000,
    installmentCount: 1800,
    minDailySetoran: 388_000,
    effectiveDate: '2026-06-01',
    note: 'Unit Avanza 2024',
    createdAt: '2026-06-01T03:00:00.000Z',
    entries: [
      {
        seq: 1,
        date: '2026-06-02',
        dailySetoran: 423_000,
        obligation: 388_000,
        amount: 35_000,
        paidCumulative: 35_000,
        arrearsAfter: 0,
      },
      {
        seq: 2,
        date: '2026-06-03',
        dailySetoran: 408_000,
        obligation: 388_000,
        amount: 20_000, // surplus kurang dari nominal → potongan sebagian
        paidCumulative: 55_000,
        arrearsAfter: 0,
      },
      {
        seq: 3,
        date: '2026-06-04',
        dailySetoran: 350_000,
        obligation: 388_000,
        amount: 0, // di bawah setoran wajib → tidak ada penarikan
        paidCumulative: 55_000,
        arrearsAfter: 38_000,
      },
      {
        seq: 4,
        date: '2026-06-05',
        dailySetoran: 500_000,
        obligation: 426_000,
        amount: 74_000,
        paidCumulative: 129_000,
        arrearsAfter: 0,
      },
    ],
  },
  // Fixed mode COP: full nominal every active day → never behind schedule.
  {
    id: 5,
    title: 'COP (Car Ownership Program)',
    driverName: 'ERPAN ERPIANA',
    lastPlate: 'B2446SNC',
    installmentAmount: 35_000,
    installmentCount: 1800,
    minDailySetoran: null,
    effectiveDate: '2026-07-01',
    note: null,
    createdAt: '2026-07-01T03:00:00.000Z',
    entries: [
      {
        seq: 1,
        date: '2026-07-02',
        dailySetoran: 410_000,
        obligation: 0,
        amount: 35_000,
        paidCumulative: 35_000,
        arrearsAfter: 0,
      },
      {
        seq: 2,
        date: '2026-07-03',
        dailySetoran: 395_000,
        obligation: 0,
        amount: 35_000,
        paidCumulative: 70_000,
        arrearsAfter: 0,
      },
    ],
  },
];

let store: StoredRule[] = seed();

export function resetInstallments(): void {
  store = seed();
  nextId = 100;
}

export const driverOptions: DriverOption[] = [
  { driverName: 'AMIR YUN', lastPlate: 'B2448SNC' },
  { driverName: 'ERPAN ERPIANA', lastPlate: 'B2446SNC' },
  { driverName: 'SUWANTO', lastPlate: 'B2991UNS' },
  { driverName: 'YULIUS BAMBANG TRIUTOMO', lastPlate: 'B2451SNC' },
];

/** Same rule→row presentation the BE presenter applies (surplus ledger). */
function present(rule: StoredRule): InstallmentRule {
  const last = rule.entries.length > 0 ? rule.entries[rule.entries.length - 1]! : null;
  const totalPaid = last?.paidCumulative ?? 0;
  const totalTarget = rule.installmentAmount * rule.installmentCount;
  const lastPaid = [...rule.entries].reverse().find((e) => e.amount > 0) ?? null;
  return {
    id: rule.id,
    title: rule.title,
    driverName: rule.driverName,
    lastPlate: rule.lastPlate,
    installmentAmount: rule.installmentAmount,
    installmentCount: rule.installmentCount,
    minDailySetoran: rule.minDailySetoran,
    effectiveDate: rule.effectiveDate,
    note: rule.note,
    createdAt: rule.createdAt,
    paidCount: Math.min(rule.installmentCount, Math.floor(totalPaid / rule.installmentAmount)),
    totalPaid,
    totalTarget,
    remaining: totalTarget - totalPaid,
    setoranArrears: last?.arrearsAfter ?? 0,
    status: totalPaid >= totalTarget ? 'lunas' : 'berjalan',
    lastInstallmentDate: lastPaid?.date ?? null,
  };
}

/** Reproduces the backend filter → sort → paginate pipeline over the store. */
export function queryInstallments(params: Partial<InstallmentListParams>): {
  data: InstallmentRule[];
  meta: { page: number; pageSize: number; total: number };
} {
  const sortBy = params.sortBy ?? 'createdAt';
  const sortOrder = params.sortOrder ?? 'desc';
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;

  let rows = store.map(present);
  if (params.status) rows = rows.filter((r) => r.status === params.status);
  const needle = (params.search ?? '').trim().toUpperCase();
  if (needle) {
    rows = rows.filter(
      (r) =>
        r.title.toUpperCase().includes(needle) ||
        r.driverName.toUpperCase().includes(needle) ||
        (r.lastPlate ?? '').toUpperCase().includes(needle.replace(/[^A-Z0-9]/g, '')),
    );
  }
  const dir = sortOrder === 'desc' ? -1 : 1;
  rows = [...rows].sort((a, b) => {
    const va = a[sortBy];
    const vb = b[sortBy];
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'id');
    return dir * cmp || a.id - b.id;
  });
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    meta: { page, pageSize, total: rows.length },
  };
}

// ---- Car Ownership Program ---------------------------------------------------
// Mirrors BE src/deposit-installments/cop-presenter.ts exactly: same COP title
// test, same programme figures, same filter → sort → paginate pipeline.

const isCopTitle = (title: string): boolean => /^\s*COP\b/i.test(title);

function presentCop(rule: StoredRule): CopRow {
  const base = present(rule);
  const withdrawals = rule.entries.filter((e) => e.amount > 0);
  const scheduleDue = Math.min(rule.entries.length * rule.installmentAmount, base.totalTarget);
  return {
    ...base,
    tenorMonths: Math.round(rule.installmentCount / COP_DAYS_PER_MONTH),
    activeDays: rule.entries.length,
    withdrawalCount: withdrawals.length,
    firstWithdrawalDate: withdrawals[0]?.date ?? null,
    scheduleDue,
    scheduleGap: scheduleDue - base.totalPaid,
  };
}

function selectCop(params: Pick<CopListParams, 'status' | 'search'>): CopRow[] {
  let rows = store.filter((r) => isCopTitle(r.title)).map(presentCop);
  if (params.status) rows = rows.filter((r) => r.status === params.status);
  const needle = (params.search ?? '').trim().toUpperCase();
  if (needle) {
    rows = rows.filter(
      (r) =>
        r.driverName.toUpperCase().includes(needle) ||
        (r.lastPlate ?? '').toUpperCase().includes(needle.replace(/[^A-Z0-9]/g, '')),
    );
  }
  return rows;
}

export function queryCop(params: Partial<CopListParams>): {
  data: CopRow[];
  meta: { page: number; pageSize: number; total: number };
} {
  const sortBy = params.sortBy ?? 'remaining';
  const sortOrder = params.sortOrder ?? 'desc';
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;

  const dir = sortOrder === 'desc' ? -1 : 1;
  const rows = [...selectCop(params)].sort((a, b) => {
    const va = a[sortBy];
    const vb = b[sortBy];
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'id');
    return dir * cmp || a.id - b.id;
  });
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    meta: { page, pageSize, total: rows.length },
  };
}

export function findInstallment(id: number): InstallmentRule | null {
  const rule = store.find((r) => r.id === id);
  return rule ? present(rule) : null;
}

export function findRecap(
  id: number,
): { rule: InstallmentRule; installments: InstallmentEntry[] } | null {
  const rule = store.find((r) => r.id === id);
  return rule ? { rule: present(rule), installments: rule.entries } : null;
}

export function createInstallment(input: InstallmentUpsertInput): InstallmentRule {
  const rule: StoredRule = {
    id: nextId++,
    title: input.title,
    driverName: input.driverName.toUpperCase(),
    lastPlate:
      driverOptions.find((o) => o.driverName === input.driverName.toUpperCase())?.lastPlate ?? null,
    installmentAmount: input.installmentAmount,
    installmentCount: input.installmentCount,
    minDailySetoran: input.minDailySetoran ?? null,
    effectiveDate: input.effectiveDate,
    note: input.note ?? null,
    createdAt: new Date().toISOString(),
    entries: [],
  };
  store.push(rule);
  return present(rule);
}

export function updateInstallment(
  id: number,
  input: InstallmentUpsertInput,
): InstallmentRule | null {
  const rule = store.find((r) => r.id === id);
  if (!rule) return null;
  rule.title = input.title;
  rule.driverName = input.driverName.toUpperCase();
  rule.installmentAmount = input.installmentAmount;
  rule.installmentCount = input.installmentCount;
  rule.minDailySetoran = input.minDailySetoran ?? null;
  rule.effectiveDate = input.effectiveDate;
  rule.note = input.note ?? null;
  return present(rule);
}

export function deleteInstallment(id: number): boolean {
  const idx = store.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  return true;
}
