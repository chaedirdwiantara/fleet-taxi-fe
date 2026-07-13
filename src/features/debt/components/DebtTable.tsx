import { ArrowDown, ArrowUp, ArrowUpDown, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/money';
import type { DebtRow, DebtSortField, SortOrder } from '../types';

// `62`-normalized wa.me link ('08…' → '628…'); null when no usable number.
export function waLink(phone: string | null): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith('0') ? `62${digits.slice(1)}` : digits}`;
}

/** Money cell — muted dash for zero/null so debts stand out (as in legacy). */
function money(v: number | null): React.ReactNode {
  if (v == null || v === 0) return <span className="text-muted-foreground">-</span>;
  return formatRupiah(v);
}

const COLUMNS: Array<{ label: string; sort?: DebtSortField; numeric?: boolean }> = [
  { label: 'Driver', sort: 'driverName' },
  { label: 'Cabang', sort: 'cabang' },
  { label: 'Koordinator', sort: 'koordinator' },
  { label: 'Plat Nomor Terakhir' },
  { label: 'Deposit Terbayar', sort: 'depositTerbayar', numeric: true },
  { label: 'Tagihan Setoran', sort: 'tagihanSetoran', numeric: true },
  { label: 'Tagihan ETLE', numeric: true },
  { label: 'Tagihan Own Risk', numeric: true },
  { label: 'Cicilan Lainnya', numeric: true },
  { label: 'Total Tagihan', sort: 'totalTagihan', numeric: true },
  { label: 'Deposit vs Total Outstanding', sort: 'selisihDeposit', numeric: true },
  { label: 'Aksi' },
];

export function DebtTable({
  rows,
  sortBy,
  sortOrder,
  onSort,
}: {
  rows: DebtRow[];
  sortBy: DebtSortField;
  sortOrder: SortOrder;
  onSort: (field: DebtSortField) => void;
}) {
  return (
    <div className="overflow-x-auto">
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
          {rows.map((row) => {
            const uncovered = row.selisihDeposit < 0;
            const wa = waLink(row.phone);
            return (
              <TableRow
                key={`${row.driverName}|${row.lastPlate}`}
                className={cn(uncovered && 'bg-destructive/5 hover:bg-destructive/10')}
              >
                <TableCell className="max-w-56">
                  <div className="truncate font-medium" title={row.driverName}>
                    {row.driverName}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'mt-1 px-1.5 py-0 text-[10px] uppercase',
                      row.status === 'aktif'
                        ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                        : 'border-muted-foreground/30 text-muted-foreground',
                    )}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{row.cabang}</TableCell>
                <TableCell className="whitespace-nowrap">{row.koordinator}</TableCell>
                <TableCell className="whitespace-nowrap font-medium">
                  {row.lastPlate || '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(row.depositTerbayar)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(row.tagihanSetoran)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(row.tagihanEtle)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(row.tagihanOwnRisk)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(row.cicilanLainnya)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {money(row.totalTagihan)}
                </TableCell>
                <TableCell className="text-right">
                  {uncovered ? (
                    <Badge
                      variant="destructive"
                      className="flex-col items-end gap-0 bg-destructive/10 px-2 py-1 text-destructive"
                    >
                      <span className="text-[10px] font-normal leading-tight">
                        Tidak Tercover Deposit
                      </span>
                      <span className="tabular-nums">
                        {formatRupiah(Math.abs(row.selisihDeposit))}
                      </span>
                    </Badge>
                  ) : (
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                      {row.selisihDeposit === 0 ? '-' : formatRupiah(row.selisihDeposit)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    asChild={wa != null}
                    disabled={wa == null}
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    title={wa ? `Chat WhatsApp ${row.driverName}` : 'Nomor WhatsApp tidak tersedia'}
                  >
                    {wa ? (
                      <a href={wa} target="_blank" rel="noopener noreferrer">
                        <MessageCircle aria-hidden />
                        WhatsApp
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle aria-hidden />
                        WhatsApp
                      </span>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
