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
import { useCreateRegistration, useUpdateRegistration } from '../hooks';
import type { RegistrationSummary } from '../types';
import { MasterFields, masterInputFrom, masterValuesFrom, type MasterFormValues } from './MasterFields';

// Create + edit share one form; keyed remount re-initializes it per row.
export function RegistrationFormDialog({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: RegistrationSummary | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Registrasi Driver' : 'Tambah Registrasi Driver'}</DialogTitle>
        </DialogHeader>
        {open && (
          <RegistrationForm key={initial?.id ?? 'create'} initial={initial} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RegistrationForm({
  initial,
  onClose,
}: {
  initial: RegistrationSummary | null;
  onClose: () => void;
}) {
  const create = useCreateRegistration();
  const update = useUpdateRegistration(initial?.id ?? 0);
  const mutation = initial ? update : create;

  const [values, setValues] = useState<MasterFormValues>(() => masterValuesFrom(initial));
  const patch = (p: Partial<MasterFormValues>) => setValues((prev) => ({ ...prev, ...p }));

  const canSubmit = values.name.trim() !== '';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const body = masterInputFrom(values);
    if (initial) {
      update.mutate(body, { onSuccess: onClose });
    } else {
      create.mutate(body, { onSuccess: onClose });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <MasterFields idPrefix="registration-form" values={values} onChange={patch} />

      {mutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutation.error.message}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" disabled={mutation.isPending || !canSubmit}>
          {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Simpan
        </Button>
      </DialogFooter>
    </form>
  );
}
