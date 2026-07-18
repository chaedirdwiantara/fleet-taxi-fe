import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePartnerPlatesQuery } from '@/features/partner/hooks';
import { PlateCombobox } from './PlateCombobox';
import { useCreateCheckpoint } from './hooks';
import { HANDOVER_LABELS, HANDOVER_TYPES, type HandoverType } from './types';

// New draft checkpoint: plate comes from the registered-plate list (the BE
// enforces the same allowlist), handover direction, and the counterpart.
export function CreateCheckpointDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const plates = usePartnerPlatesQuery();
  const create = useCreateCheckpoint();

  const [plateNumber, setPlateNumber] = useState('');
  const [handoverType, setHandoverType] = useState<HandoverType | ''>('');
  const [counterpartName, setCounterpartName] = useState('');
  const [counterpartPhone, setCounterpartPhone] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber || !handoverType) return;
    create.mutate(
      {
        plateNumber,
        handoverType,
        counterpartName: counterpartName.trim() || undefined,
        counterpartPhone: counterpartPhone.trim() || undefined,
      },
      {
        onSuccess: (detail) => {
          onOpenChange(false);
          void navigate({ to: '/partner/checkpoint/$id', params: { id: String(detail.id) } });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Checkpoint Baru</DialogTitle>
          <DialogDescription>
            Mulai dokumentasi serah terima unit. Foto & penilaian diisi di langkah berikutnya.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cp-plate">Nomor Plat</Label>
            <PlateCombobox
              id="cp-plate"
              plates={plates.data ?? []}
              loading={plates.isPending}
              value={plateNumber}
              onChange={setPlateNumber}
            />
            {plates.isSuccess && plates.data.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Belum ada plat terdaftar — daftarkan dulu di menu Daftarkan Plat.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-type">Jenis Serah Terima</Label>
            <Select value={handoverType} onValueChange={(v) => setHandoverType(v as HandoverType)}>
              <SelectTrigger id="cp-type" className="w-full">
                <SelectValue placeholder="Pilih jenis" />
              </SelectTrigger>
              <SelectContent>
                {HANDOVER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {HANDOVER_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-name">Nama Pihak Penerima/Penyerah (opsional)</Label>
            <Input
              id="cp-name"
              value={counterpartName}
              onChange={(e) => setCounterpartName(e.target.value)}
              placeholder="Budi Santoso"
              maxLength={120}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-phone">Telepon (opsional)</Label>
            <Input
              id="cp-phone"
              value={counterpartPhone}
              onChange={(e) => setCounterpartPhone(e.target.value)}
              placeholder="0812xxxxxxx"
              maxLength={30}
              inputMode="tel"
              autoComplete="off"
            />
          </div>

          {create.isError && (
            <p className="text-sm text-destructive" role="alert">
              {create.error.message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={create.isPending || !plateNumber || !handoverType}>
              {create.isPending && <Loader2 className="animate-spin" aria-hidden />}
              Mulai Inspeksi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
