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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePartnerPlatesQuery } from '@/features/partner/hooks';
import { HandoverPartyFields } from './HandoverPartyFields';
import { PlateCombobox } from './PlateCombobox';
import { createCheckpointErrors } from './createCheckpointSchema';
import { useCreateCheckpoint } from './hooks';
import {
  HANDOVER_LABELS,
  HANDOVER_TYPES,
  toPartyFields,
  type HandoverPartyNames,
  type HandoverType,
} from './types';

const EMPTY_PARTIES: HandoverPartyNames = { giverName: '', receiverName: '', counterpartPhone: '' };

// New draft checkpoint: plate comes from the registered-plate list (the BE
// enforces the same allowlist), the handover direction, and both parties —
// penyerah and penerima, which the direction assigns to partner/counterpart.
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
  const [parties, setParties] = useState<HandoverPartyNames>(EMPTY_PARTIES);
  const [submitted, setSubmitted] = useState(false);

  const invalid = createCheckpointErrors({ plateNumber, handoverType, ...parties });
  // Errors surface only after the first submit, then stay live as fields are fixed
  const errors = submitted ? invalid : {};

  const reset = () => {
    setPlateNumber('');
    setHandoverType('');
    setParties(EMPTY_PARTIES);
    setSubmitted(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(invalid).length > 0 || !handoverType) return;
    create.mutate(
      {
        plateNumber,
        handoverType,
        ...toPartyFields(handoverType, parties),
      },
      {
        onSuccess: (detail) => {
          onOpenChange(false);
          reset();
          void navigate({ to: '/partner/checkpoint/$id', params: { id: String(detail.id) } });
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // Don't greet the next checkpoint with the previous one's errors
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
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
              invalid={!!errors.plateNumber}
            />
            {plates.isSuccess && plates.data.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Belum ada plat terdaftar — daftarkan dulu di menu Daftarkan Plat.
              </p>
            )}
            {errors.plateNumber && <p className="text-xs text-destructive">{errors.plateNumber}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-type">Jenis Serah Terima</Label>
            <Select value={handoverType} onValueChange={(v) => setHandoverType(v as HandoverType)}>
              <SelectTrigger id="cp-type" className="w-full" aria-invalid={!!errors.handoverType}>
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
            {errors.handoverType && (
              <p className="text-xs text-destructive">{errors.handoverType}</p>
            )}
          </div>

          <HandoverPartyFields
            handoverType={handoverType}
            value={parties}
            onChange={setParties}
            errors={errors}
          />

          {create.isError && (
            <p className="text-sm text-destructive" role="alert">
              {create.error.message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            {/* Enabled even when incomplete — submitting is how the user finds
                out *which* field is missing, which a dead button can't say. */}
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" aria-hidden />}
              Mulai Inspeksi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
