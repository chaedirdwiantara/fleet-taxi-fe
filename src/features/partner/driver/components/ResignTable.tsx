import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTimeWIB } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import type { ResignationSummary } from '../types';
import { DepositReturnStatusBadge } from './StatusBadge';

// Note: the summary payload carries no documents — the bukti-pengembalian
// link lives on the detail page (Kelola Pengembalian).
export function ResignTable({
  items,
  onOpenDetail,
}: {
  items: ResignationSummary[];
  onOpenDetail: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode Driver</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Tanggal Bergabung</TableHead>
            <TableHead>Tanggal Resign</TableHead>
            <TableHead className="text-right">Deposit</TableHead>
            <TableHead>Status Pengembalian</TableHead>
            <TableHead className="w-44 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-nowrap font-mono text-sm">
                {item.driverCode ?? '-'}
              </TableCell>
              <TableCell className="font-semibold">{item.name}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateTimeWIB(item.joinedAt)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateTimeWIB(item.resignedAt)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRupiah(item.depositAmount)}
              </TableCell>
              <TableCell>
                <DepositReturnStatusBadge status={item.depositReturnStatus} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Kelola pengembalian ${item.name}`}
                  onClick={() => onOpenDetail(item.id)}
                >
                  <Wallet aria-hidden />
                  Kelola Pengembalian
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
