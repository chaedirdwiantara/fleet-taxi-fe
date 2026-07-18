import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Platform } from '@/lib/query-client';
import type { FleetRow } from '../types';
import { useDetailQuery, useEditDriver } from '../hooks/useDetails';
import { useTargetQuery, useUpdateTarget } from '../hooks/useTargets';

type FormValues = {
  driverName: string;
  vehiclePlate: string;
  isManualPaymentSetoran: '0' | '1';
  manualPaymentNote: string;
  fleetTarget: string;
  rentalPartner: string;
  deliveryBatch: string;
  serviceArea: string;
  vehicleType: string;
};

/**
 * Faithful port of the legacy edit_driver form (Gojek). Two shapes in one:
 *  • Normal plated row → edit driver/plate + target metadata ("Edit Detail &
 *    Target" / "Set Target").
 *  • "Manual Payment tanpa plat" row (row.detailId set) → assign a plate and
 *    toggle Masuk / Tidak Masuk Setoran on that single detail.
 * Region is intentionally omitted (ref_pickup_points master not ported).
 */
export function DriverEditor({
  platform,
  row,
  month,
  year,
  onClose,
}: {
  platform: Platform;
  row: FleetRow;
  month: number;
  year: number;
  onClose: () => void;
}) {
  const isManual = row.detailId !== null;

  const detail = useDetailQuery(platform, row.detailId, { month, year });
  // Skip the target lookup for manual rows (no plate to key on yet); a plated
  // row with no target row 404s → handled as the "Set Target" empty case.
  const target = useTargetQuery(platform, isManual ? null : row.plateNorm);
  const editDriver = useEditDriver(platform);
  const updateTarget = useUpdateTarget(platform);

  const prefillReady = isManual
    ? detail.isSuccess || detail.isError
    : target.isSuccess || target.isError;

  const originalPlate = isManual ? (detail.data?.vehiclePlate ?? '') : row.plateRaw;

  const form = useForm<FormValues>({
    values: prefillReady
      ? {
          driverName: row.driverName ?? '',
          vehiclePlate: originalPlate,
          isManualPaymentSetoran: isManual && detail.data?.isManualPaymentSetoran === 0 ? '0' : '1',
          manualPaymentNote: detail.data?.manualPaymentNote ?? '',
          fleetTarget: target.data?.fleetTarget ? String(target.data.fleetTarget) : '',
          rentalPartner: target.data?.rentalPartner ?? row.rentalPartner ?? '',
          deliveryBatch: target.data?.deliveryBatch ?? row.deliveryBatch ?? '',
          serviceArea: target.data?.serviceArea ?? '',
          vehicleType: target.data?.vehicleType ?? row.vehicleType ?? '',
        }
      : undefined,
  });

  const setoran = useWatch({ control: form.control, name: 'isManualPaymentSetoran' });
  const saving = editDriver.isPending || updateTarget.isPending;

  const onSubmit = form.handleSubmit(async (v) => {
    const driverChanged =
      v.driverName.trim().toUpperCase() !== (row.driverName ?? '').trim().toUpperCase();
    const plateChanged = v.vehiclePlate.trim() !== originalPlate.trim();

    // 1) import-detail edit (assign plate / toggle setoran / rename)
    if (isManual) {
      await editDriver.mutateAsync({
        detailId: row.detailId!,
        month,
        year,
        driverName: v.driverName,
        vehiclePlate: v.vehiclePlate,
        isManualPaymentSetoran: v.isManualPaymentSetoran === '0' ? 0 : 1,
        manualPaymentNote: v.isManualPaymentSetoran === '0' ? v.manualPaymentNote : undefined,
      });
    } else if (driverChanged || plateChanged) {
      await editDriver.mutateAsync({
        plate: row.plateNorm,
        month,
        year,
        driverName: v.driverName,
        vehiclePlate: v.vehiclePlate,
      });
    }

    // 2) target / grouping upsert — needs a plate to key on
    const plateForTarget = v.vehiclePlate.trim();
    if (plateForTarget) {
      const parsed = Number.parseInt(v.fleetTarget, 10);
      await updateTarget.mutateAsync({
        plate: plateForTarget,
        patch: {
          fleetTarget:
            v.fleetTarget.trim() === '' ? 0 : Number.isFinite(parsed) ? parsed : undefined,
          rentalPartner: v.rentalPartner || undefined,
          deliveryBatch: v.deliveryBatch || undefined,
          serviceArea: v.serviceArea || undefined,
          vehicleType: v.vehicleType || undefined,
        },
      });
    }

    onClose();
  });

  const field = (
    name: keyof FormValues,
    label: string,
    props?: React.ComponentProps<typeof Input>,
  ) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`drv-${name}`}>{label}</Label>
      <Input id={`drv-${name}`} {...props} {...form.register(name)} />
    </div>
  );

  const title = isManual
    ? 'Edit Manual Payment (tanpa plat)'
    : row.carId
      ? `Edit Detail & Target — ${row.plateRaw}`
      : `Set Target — ${row.plateRaw}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isManual
              ? 'Beri plat kendaraan agar transaksi ini masuk ke barisnya, atau atur status setoran.'
              : 'Kosongkan target harian agar server meng-infer dari baris “due” (fallback Rp488.000).'}
          </DialogDescription>
        </DialogHeader>

        {!prefillReady && <p className="text-sm text-muted-foreground">Memuat…</p>}

        {/* A failed detail load would otherwise render as a silently-blank form.
            (A normal row's target 404 is the expected "Set Target" case, not an error.) */}
        {isManual && detail.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Gagal memuat detail transaksi: {detail.error.message}. Periksa kembali sebelum
            menyimpan.
          </p>
        )}

        {prefillReady && (
          <form onSubmit={onSubmit} className="grid gap-3">
            {field('driverName', 'Nama driver')}
            {field('vehiclePlate', 'Plat kendaraan', {
              placeholder: isManual ? 'Assign plat (mis. B1234XYZ)' : undefined,
              autoCapitalize: 'characters',
            })}

            {isManual && (
              <div className="grid gap-1.5 rounded-md border bg-muted/30 p-3">
                <Label>Status Setoran</Label>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="1"
                      className="size-4 accent-emerald-600"
                      {...form.register('isManualPaymentSetoran')}
                    />
                    Masuk Setoran
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="0"
                      className="size-4 accent-purple-600"
                      {...form.register('isManualPaymentSetoran')}
                    />
                    Tidak Masuk Setoran
                  </label>
                </div>
                {setoran === '0' && (
                  <div className="mt-1 grid gap-1.5">
                    <Label htmlFor="drv-manualPaymentNote">Keterangan</Label>
                    <Input
                      id="drv-manualPaymentNote"
                      placeholder="Alasan tidak masuk setoran"
                      {...form.register('manualPaymentNote')}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-1 border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Target &amp; Grouping
              </p>
              <div className="grid gap-3">
                {field('fleetTarget', 'Target harian (Rp)', {
                  type: 'number',
                  min: 0,
                  step: 1000,
                  placeholder: 'infer dari due',
                })}
                {field('rentalPartner', 'Rental partner')}
                {field('deliveryBatch', 'Delivery batch')}
                {field('serviceArea', 'Service area')}
                {field('vehicleType', 'Tipe kendaraan', { placeholder: 'mis. Premium - BYD M6' })}
              </div>
            </div>

            {(editDriver.isError || updateTarget.isError) && (
              <p className="text-sm text-destructive">
                Gagal menyimpan:{' '}
                {(editDriver.error ?? updateTarget.error)?.message ?? 'terjadi kesalahan'}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
