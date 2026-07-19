import { ArrowDown, ArrowUp, ArrowUpDown, History, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateID, formatDateTimeWIB } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { InstallmentRule, InstallmentSortField, SortOrder } from '../types';

/** Money cell — muted dash for zero/null so real amounts stand out. */
function money(v: number | null): React.ReactNode {
  if (v == null || v === 0) return <span className="text-muted-foreground">-</span>;
  return formatRupiah(v);
}

export function StatusBadge({ status }: { status: InstallmentRule['status'] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'px-1.5 py-0 text-xs uppercase',
        status === 'lunas'
          ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
          : 'border-primary/40 text-primary',
      )}
    >
      {status}
    </Badge>
  );
}

/** Progres cicilan: N/M + bar. Shared by the desktop table and mobile cards. */
export function InstallmentProgress({ rule }: { rule: InstallmentRule }) {
  const pct = rule.installmentCount === 0 ? 0 : (rule.paidCount / rule.installmentCount) * 100;
  return (
    <div className="min-w-24 space-y-1">
      <div className="text-xs whitespace-nowrap text-muted-foreground">
        {rule.paidCount}/{rule.installmentCount}x
      </div>
      <Progress
        value={pct}
        aria-label={`Progres cicilan ${rule.paidCount} dari ${rule.installmentCount}`}
      />
    </div>
  );
}

const COLUMNS: Array<{ label: string; sort?: InstallmentSortField; numeric?: boolean }> = [
  { label: 'Judul', sort: 'title' },
  { label: 'Driver', sort: 'driverName' },
  { label: 'Tgl Dibuat', sort: 'createdAt' },
  { label: 'Tanggal Aktif', sort: 'effectiveDate' },
  { label: 'Nominal Cicilan', sort: 'installmentAmount', numeric: true },
  { label: 'Durasi', sort: 'installmentCount' },
  { label: 'Min Setoran Harian', numeric: true },
  { label: 'Total Cicilan', sort: 'totalTarget', numeric: true },
  { label: 'Total Terbayar', sort: 'totalPaid', numeric: true },
  { label: 'Sisa', sort: 'remaining', numeric: true },
  { label: 'Note' },
  { label: 'Aksi' },
];

export function InstallmentTable({
  rows,
  sortBy,
  sortOrder,
  onSort,
  onRekap,
  onEdit,
  onDelete,
}: {
  rows: InstallmentRule[];
  sortBy: InstallmentSortField;
  sortOrder: SortOrder;
  onSort: (field: InstallmentSortField) => void;
  onRekap: (rule: InstallmentRule) => void;
  onEdit: (rule: InstallmentRule) => void;
  onDelete: (rule: InstallmentRule) => void;
}) {
  const actions = (rule: InstallmentRule) => (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onRekap(rule)}
        aria-label={`Rekap ${rule.title}`}
        title="Rekap"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <History className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onEdit(rule)}
        aria-label={`Edit ${rule.title}`}
        title="Edit"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onDelete(rule)}
        aria-label={`Hapus ${rule.title}`}
        title="Hapus"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((col) => (
                <TableHead
                  key={col.label}
                  className={cn('whitespace-nowrap', col.numeric && 'text-right')}
                >
                  {col.sort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.sort!)}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-foreground',
                        col.numeric && 'flex-row-reverse',
                        sortBy === col.sort && 'text-foreground',
                      )}
                    >
                      {col.label}
                      {sortBy === col.sort ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="size-3.5" aria-label="urut naik" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-label="urut turun" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="max-w-52">
                  <div className="truncate font-medium" title={rule.title}>
                    {rule.title}
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={rule.status} />
                  </div>
                </TableCell>
                <TableCell className="max-w-48">
                  <div className="truncate" title={rule.driverName}>
                    {rule.driverName}
                  </div>
                  {rule.lastPlate && (
                    <div className="text-xs text-muted-foreground">{rule.lastPlate}</div>
                  )}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatDateTimeWIB(rule.createdAt)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDateID(rule.effectiveDate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(rule.installmentAmount)}
                </TableCell>
                <TableCell>
                  <InstallmentProgress rule={rule} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(rule.minDailySetoran)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(rule.totalTarget)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {money(rule.totalPaid)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(rule.remaining)}</TableCell>
                <TableCell className="max-w-40">
                  {rule.note ? (
                    <span className="block truncate text-muted-foreground" title={rule.note}>
                      {rule.note}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{actions(rule)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y md:hidden">
        {rows.map((rule) => (
          <div key={rule.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium" title={rule.title}>
                  {rule.title}
                </div>
                <div className="truncate text-sm text-muted-foreground" title={rule.driverName}>
                  {rule.driverName}
                  {rule.lastPlate ? ` · ${rule.lastPlate}` : ''}
                </div>
              </div>
              <StatusBadge status={rule.status} />
            </div>
            <InstallmentProgress rule={rule} />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Nominal Cicilan</dt>
              <dd className="text-right tabular-nums">{money(rule.installmentAmount)}</dd>
              <dt className="text-muted-foreground">Total Terbayar</dt>
              <dd className="text-right font-medium tabular-nums">{money(rule.totalPaid)}</dd>
              <dt className="text-muted-foreground">Sisa</dt>
              <dd className="text-right tabular-nums">{money(rule.remaining)}</dd>
              <dt className="text-muted-foreground">Tanggal Aktif</dt>
              <dd className="text-right">{formatDateID(rule.effectiveDate)}</dd>
            </dl>
            {actions(rule)}
          </div>
        ))}
      </div>
    </>
  );
}
