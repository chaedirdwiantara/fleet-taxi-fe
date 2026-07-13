import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdatePaymentStatus } from '../hooks';
import type { PaymentStatus, RentalItem } from '../types';

// Small dialog opened from the status badge: pick a status, Simpan.
export function PaymentStatusDialog({
  item,
  onClose,
}: {
  item: RentalItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={item != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ubah Status Bayar</DialogTitle>
          {item && (
            <DialogDescription>
              {item.plateNumber}
              {item.customerName ? ` · ${item.customerName}` : ''}
            </DialogDescription>
          )}
        </DialogHeader>
        {item && <PaymentStatusForm key={item.id} item={item} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function PaymentStatusForm({ item, onClose }: { item: RentalItem; onClose: () => void }) {
  const [status, setStatus] = useState<PaymentStatus>(item.paymentStatus);
  const mutation = useUpdatePaymentStatus();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ id: item.id, paymentStatus: status }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="payment-status-select">Status Bayar</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as PaymentStatus)}>
          <SelectTrigger id="payment-status-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Belum Dibayar">Belum Dibayar</SelectItem>
            <SelectItem value="Sudah Dibayar">Sudah Dibayar</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {mutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutation.error.message}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Simpan
        </Button>
      </DialogFooter>
    </form>
  );
}
