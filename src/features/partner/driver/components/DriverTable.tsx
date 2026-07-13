import { Eye, Pencil, UserMinus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import type { DriverSummary } from '../types';
import { ActiveBadge, DepositStatusBadge } from './StatusBadge';

export function DriverTable({
  items,
  onOpenDetail,
  onEdit,
  onResign,
  resignPending,
}: {
  items: DriverSummary[];
  onOpenDetail: (id: number) => void;
  onEdit: (item: DriverSummary) => void;
  onResign: (id: number) => void;
  resignPending: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode Driver</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Kontak</TableHead>
            <TableHead>Plat Unit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Deposit</TableHead>
            <TableHead>Masa Berlaku SIM</TableHead>
            <TableHead className="w-28 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-nowrap font-mono text-sm">
                {item.driverCode ?? '-'}
              </TableCell>
              <TableCell className="font-semibold">{item.name}</TableCell>
              <TableCell>
                <div className="text-sm">{item.email || '-'}</div>
                {item.phone && <div className="text-xs text-muted-foreground">{item.phone}</div>}
              </TableCell>
              <TableCell className="whitespace-nowrap">{item.plateNumber || '-'}</TableCell>
              <TableCell>
                <ActiveBadge isActive={item.isActive} />
              </TableCell>
              <TableCell>
                <DepositStatusBadge status={item.depositStatus} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {item.simExpired ? formatDateID(item.simExpired) : '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Detail driver ${item.name}`}
                    className="text-sky-600 hover:bg-sky-500/10"
                    onClick={() => onOpenDetail(item.id)}
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit driver ${item.name}`}
                    className="text-amber-600 hover:bg-amber-500/10"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Resign driver ${item.name}`}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <UserMinus className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Resign driver ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {item.name} ({item.driverCode ?? 'tanpa kode'}) akan dipindahkan ke
                          Driver Resign. Pengembalian deposit dikelola dari sana.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onResign(item.id)}
                          disabled={resignPending}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Resign
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
