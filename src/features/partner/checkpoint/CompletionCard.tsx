import { useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CheckCircle2, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiErrorException } from '@/lib/api-client/client';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';
import { useCompleteCheckpoint, useUploadMedia } from './hooks';
import {
  checkpointProgress,
  handoverSides,
  partyName,
  type CheckpointDetail,
  type HandoverSide,
} from './types';

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

/**
 * Final step of a draft, inline at the bottom of the inspection: odometer +
 * battery + notes, both parties' signatures (uploaded as PNGs through the same
 * presign flow), then complete.
 *
 * The signature pads stay disabled until every point is assessed *and*
 * photographed — the same condition the BE enforces on `complete` — so the two
 * parties never sign a record that is about to be rejected. A 400 from the
 * server still carries `details` listing anything else that is missing.
 */
export function CompletionCard({ detail }: { detail: CheckpointDetail }) {
  const complete = useCompleteCheckpoint(detail.id);
  const upload = useUploadMedia(detail.id);
  const giverSigRef = useRef<SignaturePadHandle>(null);
  const receiverSigRef = useRef<SignaturePadHandle>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { total, assessed, photographed, ready } = checkpointProgress(detail);
  const [giver, receiver] = handoverSides(detail.handoverType);

  const save = async (values: FormValues) => {
    setSubmitError(null);
    setMissingItems([]);

    const giverSig = await giverSigRef.current?.toBlob();
    const receiverSig = await receiverSigRef.current?.toBlob();
    if (!giverSig || !receiverSig) {
      setSubmitError('Tanda tangan penyerah dan penerima wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await upload.mutateAsync({ kind: giver.signatureKind, blob: giverSig });
      await upload.mutateAsync({ kind: receiver.signatureKind, blob: receiverSig });
      await complete.mutateAsync({
        odometerKm: values.odometerKm,
        batteryPercent: values.batteryPercent,
        generalNotes: values.generalNotes?.trim() || undefined,
      });
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

  const signaturePad = (side: HandoverSide, ref: React.Ref<SignaturePadHandle>) => (
    <SignaturePad
      ref={ref}
      label={`Tanda Tangan ${side.roleLabel}`}
      signerName={`${partyName(detail, side.party)} · ${side.partyLabel}`}
      disabled={!ready}
    />
  );

  return (
    <Card className="py-4">
      <CardContent className="space-y-4 px-4">
        <div>
          <h3 className="text-sm font-semibold">Penyelesaian</h3>
          <p className="text-xs text-muted-foreground">
            Isi odometer & baterai, lalu kedua pihak menandatangani.
          </p>
        </div>

        <form onSubmit={(e) => void form.handleSubmit(save)(e)} className="space-y-4">
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

          {!ready && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Tanda tangan aktif setelah semua titik dinilai dan difoto — saat ini {assessed}/
              {total} dinilai · {photographed}/{total} difoto.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {signaturePad(giver, giverSigRef)}
            {signaturePad(receiver, receiverSigRef)}
          </div>

          {missingItems.length > 0 && (
            <div
              className="rounded-md border border-destructive/40 bg-destructive/5 p-3"
              role="alert"
            >
              <p className="mb-1 text-sm font-medium text-destructive">Checkpoint belum lengkap:</p>
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

          <Button type="submit" className="h-12 w-full" disabled={submitting || !ready}>
            {submitting ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : ready ? (
              <CheckCircle2 aria-hidden />
            ) : (
              <Lock aria-hidden />
            )}
            Selesaikan & Kunci Checkpoint
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Setelah diselesaikan, checkpoint terkunci dan tidak bisa diubah.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
