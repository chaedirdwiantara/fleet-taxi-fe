import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDateID } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import { dayTone, toneClass } from '../lib/rentalDayTone';
import type { RentalGridBooking, RentalGridRow } from '../types';

// The bookings behind one pivot cell. Rendered straight from the row the grid
// already holds — the grid response ships each plate's bookings for exactly this
// reason, so opening a cell costs no request and can never disagree with the
// colour of the cell that opened it.
//
// Plural on purpose: a plate let out for six hours can be let out again that day
// to another customer, so a cell's `amount` may be the sum of several bookings.
// Showing only one of them would report less money than the cell itself.
export function RentalDayCellModal({
  row,
  day,
  month,
  year,
  onClose,
}: {
  row: RentalGridRow;
  day: number;
  month: number;
  year: number;
  onClose: () => void;
}) {
  const cell = row.days[day];
  const bookings = row.bookings.filter((b) => cell?.rentalIds.includes(b.id));
  const dateLabel = formatDateID(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85svh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rincian Sewa</DialogTitle>
          <DialogDescription>
            {row.plateNumber}
            {row.vehicleType ? ` · ${row.vehicleType}` : ''} · {dateLabel}
          </DialogDescription>
        </DialogHeader>

        {bookings.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            Tidak ada transaksi sewa pada tanggal ini.
          </p>
        )}

        {bookings.length > 0 && (
          <div className="space-y-4">
            <div
              className={cn(
                'flex items-baseline justify-between rounded-lg px-3 py-2',
                toneClass(dayTone(cell)),
              )}
            >
              <span className="text-sm font-medium">
                Omset hari ini
                {bookings.length > 1 && (
                  <span className="ml-1.5 font-normal">({bookings.length} penyewaan terpisah)</span>
                )}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatRupiah(cell?.amount ?? 0)}
              </span>
            </div>

            {/* One block per booking, separated so two lets of the same car on
                the same day never read as one transaction. */}
            <div className="divide-y">
              {bookings.map((booking) => (
                <BookingDetails key={booking.id} booking={booking} />
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Angka transaksi di atas sudah dipotong ke bulan yang sedang dilihat, sama seperti di
              Rental Management. PPN tidak termasuk dalam omset maupun nett profit.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BookingDetails({ booking }: { booking: RentalGridBooking }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 py-3 text-sm first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">Penyewa</dt>
      <dd className="font-medium">{booking.customerName || 'Tanpa nama penyewa'}</dd>

      <dt className="text-muted-foreground">Periode</dt>
      <dd>
        {formatDateID(booking.displayStartDate)} – {formatDateID(booking.displayEndDate)}{' '}
        <span className="text-muted-foreground">({booking.days} hari)</span>
      </dd>

      <dt className="text-muted-foreground">Jenis sewa</dt>
      <dd>{booking.rentalType ?? '-'}</dd>

      <dt className="text-muted-foreground">Status bayar</dt>
      <dd>
        <Badge variant={booking.paymentStatus === 'Sudah Dibayar' ? 'default' : 'secondary'}>
          {booking.paymentStatus}
        </Badge>
      </dd>

      <dt className="text-muted-foreground">Omset transaksi</dt>
      <dd className="tabular-nums">{formatRupiah(booking.omset)}</dd>

      <dt className="text-muted-foreground">COGS</dt>
      <dd className="tabular-nums">{formatRupiah(booking.cogsTotal)}</dd>

      <dt className="text-muted-foreground">Nett profit</dt>
      <dd
        className={cn(
          'font-semibold tabular-nums',
          booking.nettProfit < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {formatRupiah(booking.nettProfit)}
      </dd>
    </dl>
  );
}
