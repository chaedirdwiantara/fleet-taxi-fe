import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpdateDriver } from '../hooks';
import type { DriverSummary } from '../types';
import { MasterFields, masterInputFrom, masterValuesFrom, type MasterFormValues } from './MasterFields';

// Edit-only dialog for an ACTIVE driver: master data + the isActive toggle.
export function DriverFormDialog({
  driver,
  onClose,
}: {
  driver: DriverSummary | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={driver != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Driver</DialogTitle>
        </DialogHeader>
        {driver && <DriverForm key={driver.id} driver={driver} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function DriverForm({ driver, onClose }: { driver: DriverSummary; onClose: () => void }) {
  const update = useUpdateDriver(driver.id);
  const [values, setValues] = useState<MasterFormValues>(() => masterValuesFrom(driver));
  const [isActive, setIsActive] = useState(driver.isActive);
  const patch = (p: Partial<MasterFormValues>) => setValues((prev) => ({ ...prev, ...p }));

  const canSubmit = values.name.trim() !== '';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    update.mutate({ ...masterInputFrom(values), isActive }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <MasterFields idPrefix="driver-form" values={values} onChange={patch} />

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="driver-form-active">Status Aktif</Label>
          <p className="text-xs text-muted-foreground">
            Driver nonaktif tetap ada di daftar, tapi ditandai tidak beroperasi.
          </p>
        </div>
        <Switch id="driver-form-active" checked={isActive} onCheckedChange={setIsActive} />
      </div>

      {update.isError && (
        <p className="text-sm text-destructive" role="alert">
          {update.error.message}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" disabled={update.isPending || !canSubmit}>
          {update.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Simpan
        </Button>
      </DialogFooter>
    </form>
  );
}
