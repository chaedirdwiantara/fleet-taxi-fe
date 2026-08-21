import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { resignedTypeOf, type DriverSummary } from '../types';
import { DepositReturnBadge, ResignedTypeBadge, SourceBadge } from './StatusBadge';

// Driver Resign table. "Tanggal" is the day the driver left: the resign
// timestamp for a manual entry, the last day seen in the import for a detected
// one — never both, so one column reads unambiguously.
export function ResignedDriverTable({
  items,
  onOpenDetail,
}: {
  items: DriverSummary[];
  onOpenDetail: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Sumber</TableHead>
            <TableHead>Plat</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Tanggal Keluar</TableHead>
            <TableHead>Deposit</TableHead>
            <TableHead>Pengembalian</TableHead>
            <TableHead className="w-14 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const type = resignedTypeOf(item);
            return (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-sm whitespace-nowrap">
                  {item.driverCode ?? '-'}
                </TableCell>
                <TableCell className="font-semibold">{item.name}</TableCell>
                <TableCell>
                  <SourceBadge source={item.source} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{item.plateNumber || '-'}</TableCell>
                <TableCell>{type && <ResignedTypeBadge type={type} />}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {item.resignedAt
                    ? formatDateTimeWIB(item.resignedAt)
                    : item.exitedAt
                      ? formatDateID(item.exitedAt)
                      : '-'}
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium tabular-nums">
                    {item.depositAmount > 0 ? formatRupiah(item.depositAmount) : '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <DepositReturnBadge status={item.depositReturnStatus} decidedAt={null} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit driver ${item.name}`}
                    className="text-amber-600 hover:bg-amber-500/10"
                    onClick={() => onOpenDetail(item.id)}
                  >
                    <Pencil className="size-4" />
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
