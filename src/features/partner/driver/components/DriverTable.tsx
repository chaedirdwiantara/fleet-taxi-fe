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
import { formatDateID } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import type { DriverSummary } from '../types';
import { LifecycleBadge, SourceBadge } from './StatusBadge';

// Roster table — read-only rows synced from Fleet Monitoring; all editing
// (data completeness, resign, deposit return) happens on the edit page.
export function DriverTable({
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
            <TableHead>Phone</TableHead>
            <TableHead>SIM Expired</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Deposit</TableHead>
            <TableHead className="w-14 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm whitespace-nowrap">
                {item.driverCode ?? '-'}
              </TableCell>
              <TableCell className="font-semibold">{item.name}</TableCell>
              <TableCell>
                <SourceBadge source={item.source} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{item.plateNumber || '-'}</TableCell>
              <TableCell className="text-sm whitespace-nowrap">{item.phone || '-'}</TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {item.simExpired ? formatDateID(item.simExpired) : '-'}
              </TableCell>
              <TableCell>
                <LifecycleBadge isActive={item.isActive} resignedAt={item.resignedAt} />
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium tabular-nums">
                  {item.depositAmount > 0 ? formatRupiah(item.depositAmount) : '-'}
                </span>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
