import { Pencil, ShieldCheck, Trash2 } from 'lucide-react';
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
import { formatDateTimeWIB } from '@/lib/datetime';
import type { RegistrationSummary } from '../types';
import { DepositStatusBadge, RegistrationStatusBadge } from './StatusBadge';

export function RegistrationTable({
  items,
  rowOffset = 0,
  onOpenDetail,
  onEdit,
  onDelete,
  deletePending,
}: {
  items: RegistrationSummary[];
  /** Rows already on earlier pages, i.e. (page - 1) * pageSize. */
  rowOffset?: number;
  onOpenDetail: (id: number) => void;
  onEdit: (item: RegistrationSummary) => void;
  onDelete: (id: number) => void;
  deletePending: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">No</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Kontak</TableHead>
            <TableHead>Plat Unit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Deposit</TableHead>
            <TableHead>Didaftarkan</TableHead>
            <TableHead className="w-28 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground">{rowOffset + i + 1}</TableCell>
              <TableCell>
                <div className="font-semibold">{item.name}</div>
                {item.ktpNo && <div className="text-xs text-muted-foreground">KTP {item.ktpNo}</div>}
              </TableCell>
              <TableCell>
                <div className="text-sm">{item.email || '-'}</div>
                {item.phone && <div className="text-xs text-muted-foreground">{item.phone}</div>}
              </TableCell>
              <TableCell className="whitespace-nowrap">{item.plateNumber || '-'}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <RegistrationStatusBadge status={item.registrationStatus} />
                  {item.registrationStatus === 'rejected' && item.rejectNote && (
                    <div className="max-w-40 truncate text-xs text-muted-foreground">
                      {item.rejectNote}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DepositStatusBadge status={item.depositStatus} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateTimeWIB(item.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Verifikasi ${item.name}`}
                    className="text-sky-600 hover:bg-sky-500/10"
                    onClick={() => onOpenDetail(item.id)}
                  >
                    <ShieldCheck className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit registrasi ${item.name}`}
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
                        aria-label={`Hapus registrasi ${item.name}`}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus registrasi ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Registrasi {item.name} beserta semua dokumennya akan dihapus permanen.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(item.id)}
                          disabled={deletePending}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Hapus
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
