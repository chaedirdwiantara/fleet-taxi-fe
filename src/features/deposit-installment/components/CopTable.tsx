import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { formatDateID, formatDateRangeID } from '@/lib/datetime';
import { formatNumberID, formatRupiah } from '@/lib/money';
import { cn } from '@/lib/utils';
import { InstallmentProgress, StatusBadge } from './InstallmentTable';
import { SortableHeaderRow, type SortColumn } from './SortableHeaderRow';
import type { CopRow, CopSortField, SortOrder } from '../types';

/** Money cell — muted dash for zero so real amounts stand out. */
function money(v: number): React.ReactNode {
  if (v === 0) return <span className="text-muted-foreground">-</span>;
  return formatRupiah(v);
}

/** "1 – 15 Jul 2026", or a dash while nothing has been withdrawn yet. */
function withdrawalPeriod(row: CopRow): React.ReactNode {
  if (!row.firstWithdrawalDate || !row.lastInstallmentDate) {
    return <span className="text-muted-foreground">Belum ada</span>;
  }
  return formatDateRangeID(row.firstWithdrawalDate, row.lastInstallmentDate);
}

/**
 * Gap terhadap jadwal hari aktif. Positif = tertinggal (merah), negatif =
 * sudah bayar di muka (hijau) — mode surplus boleh memotong lebih dari nominal
 * pada hari setoran besar, jadi tanda minus itu kabar baik, bukan error.
 */
function GapCell({ gap }: { gap: number }) {
  if (gap === 0) return <span className="text-muted-foreground">Sesuai jadwal</span>;
  const behind = gap > 0;
  return (
    <span className={cn(behind ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')}>
      {behind ? formatRupiah(gap) : `−${formatRupiah(Math.abs(gap))}`}
      <span className="block text-xs font-normal opacity-80">
        {behind ? 'tertinggal' : 'di depan jadwal'}
      </span>
    </span>
  );
}

/** "Rp 35.000 / hari" over "1.800 hari ≈ 60 bulan" — the contract in one cell. */
function SchemeCell({ row }: { row: CopRow }) {
  return (
    <div className="whitespace-nowrap">
      <div className="tabular-nums">{formatRupiah(row.installmentAmount)} / hari</div>
      <div className="text-xs text-muted-foreground">
        {formatNumberID(row.installmentCount)} hari
        {row.tenorMonths > 0 ? ` ≈ ${row.tenorMonths} bulan` : ''}
      </div>
    </div>
  );
}

/** "3x penarikan" over the period it spans and the active days behind it. */
function WithdrawalCell({ row }: { row: CopRow }) {
  return (
    <div className="whitespace-nowrap">
      <div className="tabular-nums">
        {formatNumberID(row.withdrawalCount)}x dari {formatNumberID(row.activeDays)} hari aktif
      </div>
      <div className="text-xs text-muted-foreground">{withdrawalPeriod(row)}</div>
    </div>
  );
}

// Related figures share a cell, and the start date steps aside below xl, so the
// three the report exists for — tertarik, outstanding, gap — stay on screen
// without a horizontal scroll. `SECONDARY` must be on the header AND the cell.
const SECONDARY = 'hidden 2xl:table-cell';

const COLUMNS: Array<SortColumn<CopSortField>> = [
  { label: 'Driver', sort: 'driverName' },
  { label: 'Tanggal Aktif', sort: 'effectiveDate', className: SECONDARY },
  { label: 'Skema Cicilan' },
  { label: 'Total Kewajiban', sort: 'totalTarget', numeric: true },
  { label: 'Penarikan', sort: 'withdrawalCount' },
  { label: 'Sudah Tertarik', sort: 'totalPaid', numeric: true },
  { label: 'Outstanding', sort: 'remaining', numeric: true },
  { label: 'Gap vs Jadwal', sort: 'scheduleGap', numeric: true },
  { label: 'Aksi' },
];

export function CopTable({
  rows,
  sortBy,
  sortOrder,
  onSort,
  onRekap,
}: {
  rows: CopRow[];
  sortBy: CopSortField;
  sortOrder: SortOrder;
  onSort: (field: CopSortField) => void;
  onRekap: (row: CopRow) => void;
}) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <SortableHeaderRow
            columns={COLUMNS}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
          />
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-40">
                  <div className="truncate font-medium" title={row.driverName}>
                    {row.driverName}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {row.lastPlate && (
                      <span className="text-xs text-muted-foreground">{row.lastPlate}</span>
                    )}
                    <StatusBadge status={row.status} />
                  </div>
                  {/* the start date rides along once its own column steps aside */}
                  <div className="mt-0.5 text-xs whitespace-nowrap text-muted-foreground 2xl:hidden">
                    Aktif {formatDateID(row.effectiveDate)}
                  </div>
                </TableCell>
                <TableCell className={cn('whitespace-nowrap', SECONDARY)}>
                  {formatDateID(row.effectiveDate)}
                </TableCell>
                <TableCell>
                  <SchemeCell row={row} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="tabular-nums">{money(row.totalTarget)}</div>
                  <InstallmentProgress rule={row} />
                </TableCell>
                <TableCell>
                  <WithdrawalCell row={row} />
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {money(row.totalPaid)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(row.remaining)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  <GapCell gap={row.scheduleGap} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onRekap(row)}
                      aria-label={`Rekap penarikan ${row.driverName}`}
                      title="Rekap penarikan"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <History className="size-4" aria-hidden />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards — the four figures owners scan for, then the rest. */}
      <div className="divide-y md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium" title={row.driverName}>
                  {row.driverName}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {row.lastPlate ? `${row.lastPlate} · ` : ''}
                  {formatNumberID(row.installmentCount)} hari
                  {row.tenorMonths > 0 ? ` ≈ ${row.tenorMonths} bln` : ''}
                </div>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <InstallmentProgress rule={row} />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Cicilan / Hari</dt>
              <dd className="text-right tabular-nums">{money(row.installmentAmount)}</dd>
              <dt className="text-muted-foreground">Total Kewajiban</dt>
              <dd className="text-right tabular-nums">{money(row.totalTarget)}</dd>
              <dt className="text-muted-foreground">Sudah Tertarik</dt>
              <dd className="text-right font-medium tabular-nums">{money(row.totalPaid)}</dd>
              <dt className="text-muted-foreground">Outstanding</dt>
              <dd className="text-right tabular-nums">{money(row.remaining)}</dd>
              <dt className="text-muted-foreground">Gap vs Jadwal</dt>
              <dd className="text-right font-medium tabular-nums">
                <GapCell gap={row.scheduleGap} />
              </dd>
              <dt className="text-muted-foreground">Kali Penarikan</dt>
              <dd className="text-right tabular-nums">
                {formatNumberID(row.withdrawalCount)}x dari {formatNumberID(row.activeDays)} hari
              </dd>
              <dt className="text-muted-foreground">Periode Penarikan</dt>
              <dd className="text-right">{withdrawalPeriod(row)}</dd>
              <dt className="text-muted-foreground">Tanggal Aktif</dt>
              <dd className="text-right">{formatDateID(row.effectiveDate)}</dd>
            </dl>
            <Button variant="outline" size="sm" className="w-full" onClick={() => onRekap(row)}>
              <History aria-hidden />
              Rekap penarikan
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
