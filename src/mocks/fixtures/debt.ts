import type { DebtFilters, DebtListParams, DebtRow } from '@/features/debt/types';

// Debt Summary fixtures — one row per driver, mirroring the legacy screen.
// Money is integer rupiah; selisihDeposit = depositTerbayar - totalTagihan.

const row = (
  driverName: string,
  koordinator: string,
  lastPlate: string,
  over: Partial<DebtRow> = {},
): DebtRow => {
  const base: DebtRow = {
    driverName,
    cabang: 'Jakarta',
    koordinator,
    lastPlate,
    phone: null,
    status: 'aktif',
    depositTerbayar: 0,
    tagihanSetoran: 0,
    tagihanEtle: 0,
    tagihanOwnRisk: 0,
    cicilanLainnya: null,
    totalTagihan: 0,
    selisihDeposit: 0,
    ...over,
  };
  base.totalTagihan =
    base.tagihanSetoran + base.tagihanEtle + base.tagihanOwnRisk + (base.cicilanLainnya ?? 0);
  base.selisihDeposit = base.depositTerbayar - base.totalTagihan;
  return base;
};

export const debtRows: DebtRow[] = [
  row('IQBAL FAUZI', 'Ahmad Aryawan', 'B1553RZB', {
    tagihanEtle: 100_000,
    tagihanOwnRisk: 900_000,
    phone: '081234560001',
  }),
  row('ACHMAD FAUZI FIRDAUS', 'Ahmad Aryawan', 'B1665ROW', { tagihanOwnRisk: 785_000 }),
  row('ROSITA', 'Rekli Fonda', 'B1072RZL', { tagihanOwnRisk: 752_500 }),
  row('ACHMAD RIZAL', 'Rekli Fonda', 'B2655TRU', {
    tagihanSetoran: 48_400,
    tagihanEtle: 640_000,
    phone: '081234560002',
  }),
  row('AGUNG KURNIAWAN HARTONO', 'Rekli Fonda', 'B1004ROV', {
    depositTerbayar: 1_000_000,
    tagihanSetoran: 585_000,
    tagihanEtle: 960_000,
  }),
  row('UNTUNG DEPASAU', 'Rekli Fonda', 'B1065RZI', { tagihanEtle: 492_500 }),
  row('DENDY SIREGAR', 'Ahmad Aryawan', 'B1560ROU', {
    tagihanOwnRisk: 485_000,
    status: 'nonaktif',
  }),
  row('BUDI SANTOSO', 'Rekli Fonda', 'B1000XYZ', {
    cabang: 'Bandung',
    depositTerbayar: 500_000,
    tagihanSetoran: 320_000,
    phone: '081234560003',
  }),
  row('SITI AMINAH', 'Ahmad Aryawan', 'B1001XYZ', {
    cabang: 'Bandung',
    depositTerbayar: 750_000,
    status: 'nonaktif',
  }),
  row('JOKO PRASETYO', 'Ahmad Aryawan', 'B2000GRB', {
    tagihanSetoran: 1_250_000,
    phone: '081234560004',
  }),
  row('RINA WATI', 'Rekli Fonda', 'B2001GRB', { cabang: 'Surabaya', tagihanEtle: 150_000 }),
  row('HENDRA GUNAWAN', 'Ahmad Aryawan', 'B2002GRB', {
    cabang: 'Surabaya',
    depositTerbayar: 2_000_000,
    tagihanSetoran: 400_000,
  }),
];

export const debtFilters: DebtFilters = {
  cabang: [...new Set(debtRows.map((r) => r.cabang))].sort(),
  koordinator: [...new Set(debtRows.map((r) => r.koordinator))].sort(),
};

/** Mirrors the backend's filter → sort → paginate pipeline over the fixtures. */
export function queryDebtRows(params: Partial<DebtListParams>): {
  data: DebtRow[];
  meta: { page: number; pageSize: number; total: number };
} {
  let rows = [...debtRows];
  if (params.status) rows = rows.filter((r) => r.status === params.status);
  if (params.cabang) rows = rows.filter((r) => r.cabang === params.cabang);
  if (params.koordinator) rows = rows.filter((r) => r.koordinator === params.koordinator);
  const needle = (params.search ?? '').trim().toUpperCase();
  if (needle) {
    const plateNeedle = needle.replace(/[^A-Z0-9]/g, '');
    rows = rows.filter(
      (r) =>
        r.driverName.includes(needle) || (plateNeedle !== '' && r.lastPlate.includes(plateNeedle)),
    );
  }

  const sortBy = params.sortBy ?? 'selisihDeposit';
  const dir = (params.sortOrder ?? 'asc') === 'desc' ? -1 : 1;
  rows.sort((a, b) => {
    const va = a[sortBy];
    const vb = b[sortBy];
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'id');
    return dir * cmp || a.driverName.localeCompare(b.driverName, 'id');
  });

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  return {
    data: rows.slice((page - 1) * pageSize, page * pageSize),
    meta: { page, pageSize, total: rows.length },
  };
}
