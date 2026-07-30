import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatRupiah } from '@/lib/money';
import type { MonitoringMode } from '@/features/fleet/searchSchema';
import { useGrabDriverDetailQuery, usePartnerGrabDriverDetailQuery } from './hooks';

// Legacy Grab "eye" modal — whole-month performance detail for one driver.
function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`flex justify-between px-4 py-2.5 text-sm ${highlight ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'odd:bg-muted/40'}`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function GrabCellModal({
  compositeKey,
  month,
  year,
  onClose,
  scope = 'admin',
  mode = 'plate',
}: {
  // `plate|city|driver`, or `drv:<NAME>` when the grid is read per driver.
  compositeKey: string;
  month: number;
  year: number;
  onClose: () => void;
  scope?: 'admin' | 'partner';
  // Must match the grid the row came from — the backend resolves the key against
  // a grid built in that mode.
  mode?: MonitoringMode;
}) {
  const adminQuery = useGrabDriverDetailQuery({
    compositeKey,
    month,
    year,
    mode,
    enabled: scope === 'admin',
  });
  const partnerQuery = usePartnerGrabDriverDetailQuery({
    compositeKey,
    month,
    year,
    mode,
    enabled: scope === 'partner',
  });
  const detail = scope === 'partner' ? partnerQuery : adminQuery;
  // A driver row spans plates and cities, so its subtitle names the person and
  // lets the resolved detail supply the vehicle.
  const [plate, city, driver] = compositeKey.startsWith('drv:')
    ? [detail.data?.plateNumber ?? '', '', compositeKey.slice(4) || 'Tanpa nama driver']
    : compositeKey.split('|');

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Performance Detail</DialogTitle>
          <DialogDescription>{[driver, plate, city].filter(Boolean).join(' · ')}</DialogDescription>
        </DialogHeader>

        {detail.isPending && (
          <p className="px-4 py-6 text-sm text-muted-foreground">Memuat detail…</p>
        )}
        {detail.isError && (
          <p className="px-4 py-6 text-sm text-destructive">Gagal memuat: {detail.error.message}</p>
        )}
        {detail.isSuccess && (
          <div className="pb-2">
            <Row label="Phone Number" value={detail.data.phone || '-'} />
            <Row label="Total Online Hours" value={`${detail.data.onlineHours.toFixed(2)} jam`} />
            <Row label="Total Bookings" value={detail.data.bookings.toLocaleString('id-ID')} />
            <Row label="Total Rides" value={detail.data.rides.toLocaleString('id-ID')} />
            <Row
              label="Cancel by Driver"
              value={detail.data.cancelByDriver.toLocaleString('id-ID')}
            />
            <Row
              label="Fulfillment Rate"
              value={`${(detail.data.fulfillmentRate * 100).toFixed(1)}%`}
            />
            <Row
              label="Cancellation Rate"
              value={`${(detail.data.cancellationRate * 100).toFixed(1)}%`}
            />
            <Row label="Driver Fare" value={formatRupiah(detail.data.fare)} highlight />
            <Row label="Toll & Others" value={formatRupiah(detail.data.toll)} highlight />
            <Row label="Total Incentive" value={formatRupiah(detail.data.incentive)} highlight />
            <Row
              label="Total Earning Collected"
              value={formatRupiah(detail.data.earning)}
              highlight
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
