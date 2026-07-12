import { Pencil, Trash2 } from 'lucide-react';
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
import { formatDateID } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import type { RentalItem } from '../types';

// Rental list table. All amounts arrive backend-computed; this only formats.
export function RentalTable({
  items,
  onEdit,
  onPaymentClick,
  onDelete,
  deletePending,
}: {
  items: RentalItem[];
  onEdit: (item: RentalItem) => void;
  onPaymentClick: (item: RentalItem) => void;
  onDelete: (id: number) => void;
  deletePending: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">No</TableHead>
            <TableHead>Plat &amp; Tipe</TableHead>
            <TableHead>Tanggal (Durasi)</TableHead>
            <TableHead className="text-right">Harga/Hari</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status Bayar</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Additional Cost</TableHead>
            <TableHead className="text-right">COGS</TableHead>
            <TableHead className="text-right">Nett Profit</TableHead>
            <TableHead className="w-20 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                <div className="font-semibold">{item.plateNumber}</div>
                {item.vehicleType && (
                  <div className="text-xs text-muted-foreground">{item.vehicleType}</div>
                )}
              </TableCell>
              <TableCell>
                <div className="whitespace-nowrap text-sm">
                  {formatDateID(item.displayStartDate)} – {formatDateID(item.displayEndDate)}
                </div>
                <Badge className="mt-1 border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400">
                  {item.days} Hari
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRupiah(item.pricePerDay)}
              </TableCell>
              <TableCell>
                <div className="text-sm">{item.customerName || '-'}</div>
                {item.customerPhone && (
                  <div className="text-xs text-muted-foreground">{item.customerPhone}</div>
                )}
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  className="cursor-pointer"
                  aria-label={`Ubah status bayar ${item.plateNumber}`}
                  onClick={() => onPaymentClick(item)}
                >
                  {item.paymentStatus === 'Sudah Dibayar' ? (
                    <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                      Sudah Dibayar
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="whitespace-nowrap border-destructive/40 text-destructive"
                    >
                      Belum Dibayar
                    </Badge>
                  )}
                </button>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatRupiah(item.gross)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {item.additionalCost > 0 ? (
                  <>
                    <div>{formatRupiah(item.additionalCost)}</div>
                    {item.additionalCostDescription && (
                      <div className="max-w-32 truncate text-xs text-muted-foreground">
                        {item.additionalCostDescription}
                      </div>
                    )}
                  </>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatRupiah(item.cogsTotal)}
              </TableCell>
              <TableCell
                className={`text-right font-semibold tabular-nums ${
                  item.nettProfit >= 0 ? 'text-emerald-600' : 'text-destructive'
                }`}
              >
                {formatRupiah(item.nettProfit)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit rental ${item.plateNumber}`}
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
                        aria-label={`Hapus rental ${item.plateNumber}`}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus data rental ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Rental {item.plateNumber}
                          {item.customerName ? ` · ${item.customerName}` : ''} (
                          {formatDateID(item.startDate)} – {formatDateID(item.endDate)}) akan
                          dihapus permanen dari monitoring.
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
