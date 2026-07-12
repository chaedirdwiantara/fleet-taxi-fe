import { useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ApiErrorException } from '@/lib/api-client/client';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';
import { useCompleteCheckpoint, useUploadMedia } from './hooks';

const schema = z.object({
  odometerKm: z
    .number('Odometer wajib diisi')
    .int('Harus bilangan bulat')
    .min(0, 'Tidak boleh negatif'),
  batteryPercent: z
    .number('Baterai wajib diisi')
    .int('Harus bilangan bulat')
    .min(0, 'Minimal 0')
    .max(100, 'Maksimal 100'),
  generalNotes: z.string().max(2000).optional(),
});
type FormValues = z.infer<typeof schema>;

// Final step, in a bottom sheet: odometer + battery + notes, both parties'
// signatures (uploaded as PNGs through the same presign flow), then complete.
// A 400 from the server carries `details` listing what's still missing.
export function CompleteSheet({
  checkpointId,
  open,
  onOpenChange,
}: {
  checkpointId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const complete = useCompleteCheckpoint(checkpointId);
  const upload = useUploadMedia(checkpointId);
  const partnerSigRef = useRef<SignaturePadHandle>(null);
  const counterpartSigRef = useRef<SignaturePadHandle>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const save = async (values: FormValues) => {
    setSubmitError(null);
    setMissingItems([]);

    const partnerSig = await partnerSigRef.current?.toBlob();
    const counterpartSig = await counterpartSigRef.current?.toBlob();
    if (!partnerSig || !counterpartSig) {
      setSubmitError('Kedua tanda tangan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await upload.mutateAsync({ kind: 'signature_partner', blob: partnerSig });
      await upload.mutateAsync({ kind: 'signature_counterpart', blob: counterpartSig });
      await complete.mutateAsync({
        odometerKm: values.odometerKm,
        batteryPercent: values.batteryPercent,
        generalNotes: values.generalNotes?.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiErrorException && err.details?.length) {
        setMissingItems(err.details.map((d) => d.message));
      } else {
        setSubmitError(err instanceof Error ? err.message : 'Gagal menyelesaikan checkpoint');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92svh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="pb-0">
          <SheetTitle>Selesaikan Checkpoint</SheetTitle>
        </SheetHeader>

        <form onSubmit={(e) => void form.handleSubmit(save)(e)} className="grid gap-4 p-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cp-odo">Odometer (km)</Label>
              <Input
                id="cp-odo"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="15320"
                aria-invalid={!!form.formState.errors.odometerKm}
                {...form.register('odometerKm', { valueAsNumber: true })}
              />
              {form.formState.errors.odometerKm && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.odometerKm.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-bat">Baterai (%)</Label>
              <Input
                id="cp-bat"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                placeholder="87"
                aria-invalid={!!form.formState.errors.batteryPercent}
                {...form.register('batteryPercent', { valueAsNumber: true })}
              />
              {form.formState.errors.batteryPercent && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.batteryPercent.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-notes">Catatan Umum (opsional)</Label>
            <Textarea
              id="cp-notes"
              placeholder="Kondisi umum unit, kesepakatan tambahan, dsb."
              maxLength={2000}
              {...form.register('generalNotes')}
            />
          </div>

          <SignaturePad ref={partnerSigRef} label="Tanda Tangan Petugas Partner" />
          <SignaturePad ref={counterpartSigRef} label="Tanda Tangan Pihak Penerima/Penyerah" />

          {missingItems.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3" role="alert">
              <p className="mb-1 text-sm font-medium text-destructive">
                Checkpoint belum lengkap:
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-destructive">
                {missingItems.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {submitError && (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          )}

          <Button type="submit" className="h-11" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" aria-hidden />}
            Selesaikan & Kunci Checkpoint
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Setelah diselesaikan, checkpoint terkunci dan tidak bisa diubah.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
