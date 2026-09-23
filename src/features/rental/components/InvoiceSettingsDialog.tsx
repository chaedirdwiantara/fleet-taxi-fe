import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, Info, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  INVOICE_ASSET_CONTENT_TYPE,
  resolveMediaUrl,
  useInvoiceSettingsQuery,
  useRemoveInvoiceAsset,
  useUpdateInvoiceSettings,
  useUploadInvoiceAsset,
} from '../hooks';
import type { InvoiceAssetKind, RentalInvoiceSettings } from '../types';
import { SignatureBlockPreview } from './SignatureBlockPreview';

const formSchema = z.object({
  signatoryName: z.string().trim().max(80, 'Maksimal 80 karakter'),
  signatoryTitle: z.string().trim().max(120, 'Maksimal 120 karakter'),
});
type FormValues = z.infer<typeof formSchema>;

/**
 * Who signs the partner's invoices, and the artwork embedded on a signed
 * copy. The name and title are saved with the form; each image is uploaded
 * the moment it is picked (like payment proofs), so a half-filled form never
 * holds a file hostage.
 */
export function InvoiceSettingsDialog({
  open,
  onClose,
  partnerName,
}: {
  open: boolean;
  onClose: () => void;
  /** Printed under the signature when no officer is named. */
  partnerName: string;
}) {
  const settings = useInvoiceSettingsQuery();
  // Lives here, not in the keyed form below — see TaxSettingsDialog.
  const update = useUpdateInvoiceSettings();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Atur Tanda Tangan</DialogTitle>
          <DialogDescription>
            Nama dan jabatan penandatangan dicetak di bawah tanda tangan invoice. Gambar tanda
            tangan dan stempel hanya disematkan saat Anda memilih invoice bertanda tangan.
          </DialogDescription>
        </DialogHeader>

        {settings.isPending && (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        )}
        {settings.isError && (
          <p className="text-sm text-destructive">Gagal memuat: {settings.error.message}</p>
        )}
        {settings.isSuccess && (
          <InvoiceSettingsForm
            key={`${settings.data.signatoryName ?? ''}:${settings.data.signatoryTitle ?? ''}`}
            settings={settings.data}
            partnerName={partnerName}
            update={update}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvoiceSettingsForm({
  settings,
  partnerName,
  update,
  onClose,
}: {
  settings: RentalInvoiceSettings;
  partnerName: string;
  update: ReturnType<typeof useUpdateInvoiceSettings>;
  onClose: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      signatoryName: settings.signatoryName ?? '',
      signatoryTitle: settings.signatoryTitle ?? '',
    },
  });
  const values = form.watch();
  const dirty =
    values.signatoryName.trim() !== (settings.signatoryName ?? '') ||
    values.signatoryTitle.trim() !== (settings.signatoryTitle ?? '');

  const onSubmit = form.handleSubmit((v) =>
    update.mutate(
      { signatoryName: v.signatoryName.trim(), signatoryTitle: v.signatoryTitle.trim() },
      { onSuccess: onClose },
    ),
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="signatoryName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama penandatangan</FormLabel>
                <FormControl>
                  <Input placeholder="M Rizki" autoComplete="off" {...field} />
                </FormControl>
                <FormDescription>Kosongkan untuk memakai nama partner.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="signatoryTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jabatan</FormLabel>
                <FormControl>
                  <Input placeholder="Head of Rental Operations" autoComplete="off" {...field} />
                </FormControl>
                <FormDescription>Dicetak di bawah nama.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AssetPicker
            kind="signature"
            label="Tanda tangan"
            url={settings.signatureUrl}
            hint="Wajib untuk invoice bertanda tangan."
          />
          <AssetPicker
            kind="stamp"
            label="Stempel"
            url={settings.stampUrl}
            hint="Opsional — dibubuhkan menimpa tanda tangan."
          />
        </div>

        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/40 p-4">
          <span className="text-xs font-medium text-muted-foreground">Pratinjau di invoice</span>
          <SignatureBlockPreview
            signatoryName={values.signatoryName.trim() || partnerName}
            signatoryTitle={values.signatoryTitle.trim() || null}
            signatureUrl={settings.signatureUrl}
            stampUrl={settings.stampUrl}
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Gunakan PNG 24/32-bit berlatar transparan (maksimal 2 MB) agar stempel tampak menyatu
            dengan tanda tangan. Invoice yang sudah diunduh tidak berubah.
          </span>
        </div>

        {update.isError && (
          <p className="text-sm text-destructive" role="alert">
            {update.error.message}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
            Batal
          </Button>
          <Button type="submit" disabled={!dirty || update.isPending}>
            {update.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {update.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

/** One artwork slot: preview, upload/replace, remove. Uploads apply immediately. */
function AssetPicker({
  kind,
  label,
  url,
  hint,
}: {
  kind: InvoiceAssetKind;
  label: string;
  url: string | null;
  hint: string;
}) {
  const inputId = useId();
  const upload = useUploadInvoiceAsset();
  const remove = useRemoveInvoiceAsset();
  const [error, setError] = useState<string | null>(null);
  const busy = upload.isPending || remove.isPending;

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setError(null);
    try {
      await upload.mutateAsync({ kind, file });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Gagal mengunggah ${label.toLowerCase()}`);
    }
  };

  const clear = async () => {
    setError(null);
    try {
      await remove.mutateAsync(kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Gagal menghapus ${label.toLowerCase()}`);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10"
            aria-label={`Hapus ${label.toLowerCase()}`}
            title="Hapus"
            disabled={busy}
            onClick={() => void clear()}
          >
            {remove.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        )}
      </div>

      {/* Paper-white so a transparent PNG previews the way it prints. */}
      <div
        className={cn(
          'flex h-24 items-center justify-center rounded-md border bg-white',
          !url && 'border-dashed bg-muted/40',
        )}
      >
        {url ? (
          <img
            src={resolveMediaUrl(url)}
            alt={label}
            className="max-h-20 max-w-[90%] object-contain"
          />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
        )}
      </div>

      <input
        id={inputId}
        type="file"
        accept={INVOICE_ASSET_CONTENT_TYPE}
        className="sr-only"
        aria-label={`Pilih file ${label.toLowerCase()}`}
        disabled={busy}
        onChange={(e) => void pick(e)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={busy}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        {upload.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-4" aria-hidden />
        )}
        {upload.isPending ? 'Mengunggah…' : url ? 'Ganti PNG' : 'Unggah PNG'}
      </Button>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
