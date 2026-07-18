import { useForm } from 'react-hook-form';
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
import { useTargetQuery, useUpdateTarget } from '../hooks/useTargets';

type TargetFormValues = {
  driverName: string;
  fleetTarget: string; // input as string; sent as integer rupiah
  rentalPartner: string;
  vehicleType: string;
  deliveryBatch: string;
  serviceArea: string;
};

// Edit driver + target metadata (§6.1 GET/PUT targets/:plate). fleetTarget
// kosong/0 = target harian di-infer server dari baris `due` (brief §2.A).
export function TargetEditor({
  platform,
  plate,
  onClose,
}: {
  platform: Platform;
  plate: string;
  onClose: () => void;
}) {
  const target = useTargetQuery(platform, plate);
  const update = useUpdateTarget(platform);

  const form = useForm<TargetFormValues>({
    values: target.data
      ? {
          driverName: target.data.driverName ?? '',
          fleetTarget: target.data.fleetTarget ? String(target.data.fleetTarget) : '',
          rentalPartner: target.data.rentalPartner ?? '',
          vehicleType: target.data.vehicleType ?? '',
          deliveryBatch: target.data.deliveryBatch ?? '',
          serviceArea: target.data.serviceArea ?? '',
        }
      : undefined,
  });

  const onSubmit = form.handleSubmit((values) => {
    const parsed = Number.parseInt(values.fleetTarget, 10);
    update.mutate(
      {
        plate,
        patch: {
          driverName: values.driverName || undefined,
          // 0 = clear → server infers the daily target from `due` rows
          fleetTarget: values.fleetTarget === '' ? 0 : Number.isFinite(parsed) ? parsed : undefined,
          rentalPartner: values.rentalPartner || undefined,
          vehicleType: values.vehicleType || undefined,
          deliveryBatch: values.deliveryBatch || undefined,
          serviceArea: values.serviceArea || undefined,
        },
      },
      { onSuccess: onClose },
    );
  });

  const field = (
    name: keyof TargetFormValues,
    label: string,
    props?: React.ComponentProps<typeof Input>,
  ) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`target-${name}`}>{label}</Label>
      <Input id={`target-${name}`} {...props} {...form.register(name)} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit target — {plate}</DialogTitle>
          <DialogDescription>
            Kosongkan target harian agar server meng-infer dari baris “due” (fallback Rp488.000).
          </DialogDescription>
        </DialogHeader>

        {target.isPending && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {target.isError && (
          <p className="text-sm text-destructive">Gagal memuat: {target.error.message}</p>
        )}
        {target.isSuccess && (
          <form onSubmit={onSubmit} className="grid gap-3">
            {field('driverName', 'Nama driver')}
            {field('fleetTarget', 'Target harian (Rp)', {
              type: 'number',
              min: 0,
              step: 1000,
              placeholder: 'infer dari due',
            })}
            {field('rentalPartner', 'Rental partner')}
            {field('vehicleType', 'Tipe kendaraan')}
            {field('deliveryBatch', 'Delivery batch')}
            {field('serviceArea', 'Service area')}

            {update.isError && (
              <p className="text-sm text-destructive">Gagal menyimpan: {update.error.message}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
