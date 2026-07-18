import { LogOut, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateID } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import type { ExitedDriver } from '../types';

// Click-through detail of the Outstanding Driver Keluar card (legacy
// exitedDriversModal): red header with the newest import date, numbered rows
// of every exited plate that still carries a balance — driver, plate, last
// appearance, debt — backend-sorted by outstanding descending, plus a TOTAL
// footer. Display-only; all money is server-computed.
export function ExitedDriversDialog({
  drivers,
  lastImportDate,
  onClose,
}: {
  drivers: ExitedDriver[];
  lastImportDate?: string | null;
  onClose: () => void;
}) {
  const total = drivers.reduce((s, d) => s + d.outstanding, 0);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl [&>button]:text-white [&>button]:opacity-90">
        <DialogHeader className="bg-gradient-to-br from-red-500 to-rose-400 px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-white">
            <LogOut className="size-5" aria-hidden />
            Outstanding Driver Keluar
          </DialogTitle>
          <DialogDescription className="text-white/90">
            Driver/plat yang sudah tidak muncul lagi di import
            {lastImportDate ? ` (data terakhir: ${formatDateID(lastImportDate)})` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-slim max-h-[60svh] overflow-y-auto px-6 py-4">
          {drivers.length === 0 ? (
            <EmptyState
              icon={UserX}
              title="Tidak ada driver keluar"
              description="Semua driver masih muncul di data import terbaru."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Plat</TableHead>
                  <TableHead>Terakhir Muncul</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d, i) => (
                  <TableRow key={d.plate}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="max-w-40 truncate font-medium" title={d.driverName}>
                      {d.driverName}
                    </TableCell>
                    <TableCell className="font-semibold">{d.plate}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateID(d.lastSeen)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${d.outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                      {formatRupiah(d.outstanding)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4}>TOTAL</TableCell>
                  <TableCell className="text-right">{formatRupiah(total)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
