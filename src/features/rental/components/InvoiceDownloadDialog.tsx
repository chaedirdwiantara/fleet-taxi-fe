import { useState } from 'react';
import { Check, FileText, Loader2, PenLine, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateID } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { useInvoiceSettingsQuery } from '../hooks';
import type { RentalInvoiceSettings, RentalItem } from '../types';
import { SignatureBlockPreview } from './SignatureBlockPreview';

/**
 * Asks how the invoice should be signed before generating it. A signed copy
 * needs an uploaded signature, so that option explains itself (and links to
 * the settings) rather than failing after the click.
 */
export function InvoiceDownloadDialog({
  item,
  partnerName,
  pending,
  error,
  onClose,
  onDownload,
  onOpenSettings,
}: {
  item: RentalItem | null;
  partnerName: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onDownload: (item: RentalItem, signed: boolean) => void;
  onOpenSettings: () => void;
}) {
  const settings = useInvoiceSettingsQuery();

  return (
    <Dialog open={item != null} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unduh Invoice</DialogTitle>
          <DialogDescription>
            {item && (
              <>
                {item.plateNumber}
                {item.customerName ? ` · ${item.customerName}` : ''} ·{' '}
                {formatDateID(item.startDate)} – {formatDateID(item.endDate)}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {settings.isPending && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {settings.isError && (
          <p className="text-sm text-destructive">Gagal memuat: {settings.error.message}</p>
        )}
        {settings.isSuccess && item && (
          <SigningChoice
            item={item}
            settings={settings.data}
            partnerName={partnerName}
            pending={pending}
            error={error}
            onClose={onClose}
            onDownload={onDownload}
            onOpenSettings={onOpenSettings}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SigningChoice({
  item,
  settings,
  partnerName,
  pending,
  error,
  onClose,
  onDownload,
  onOpenSettings,
}: {
  item: RentalItem;
  settings: RentalInvoiceSettings;
  partnerName: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onDownload: (item: RentalItem, signed: boolean) => void;
  onOpenSettings: () => void;
}) {
  const canSign = settings.signatureUrl != null;
  // Signed by default whenever it is possible — that is the copy customers expect.
  const [signed, setSigned] = useState(canSign);
  const signatoryName = settings.signatoryName || partnerName;

  return (
    <>
      <div role="radiogroup" aria-label="Jenis invoice" className="space-y-3">
        <ChoiceCard
          checked={signed}
          disabled={!canSign}
          onSelect={() => setSigned(true)}
          icon={<PenLine className="size-4" aria-hidden />}
          title="Dengan tanda tangan & stempel"
          description={
            canSign
              ? `Ditandatangani oleh ${signatoryName}${
                  settings.signatoryTitle ? `, ${settings.signatoryTitle}` : ''
                }.`
              : 'Tanda tangan belum diunggah.'
          }
        >
          {canSign ? (
            <SignatureBlockPreview
              signatoryName={signatoryName}
              signatoryTitle={settings.signatoryTitle}
              signatureUrl={settings.signatureUrl}
              stampUrl={settings.stampUrl}
              className="mt-3"
            />
          ) : (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-1 h-auto px-0"
              onClick={onOpenSettings}
            >
              <Settings aria-hidden />
              Atur tanda tangan
            </Button>
          )}
        </ChoiceCard>
        <ChoiceCard
          checked={!signed}
          onSelect={() => setSigned(false)}
          icon={<FileText className="size-4" aria-hidden />}
          title="Tanpa tanda tangan"
          description={`Nama ${signatoryName} tetap dicetak; ruang tanda tangan dikosongkan untuk ditandatangani manual.`}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Batal
        </Button>
        <Button type="button" onClick={() => onDownload(item, signed)} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? 'Membuat PDF…' : 'Unduh PDF'}
        </Button>
      </DialogFooter>
    </>
  );
}

/** A radio rendered as a card, so each option has room to explain itself. */
function ChoiceCard({
  checked,
  disabled = false,
  onSelect,
  icon,
  title,
  description,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        checked ? 'border-primary bg-primary/5' : 'bg-card',
        disabled && 'opacity-70',
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={onSelect}
        className="flex w-full items-start gap-3 text-left focus-visible:outline-none disabled:cursor-not-allowed"
      >
        <span
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
            checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
          )}
          aria-hidden
        >
          {checked && <Check className="size-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {icon}
            {title}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        </span>
      </button>
      {children && <div className="flex justify-center pl-8">{children}</div>}
    </div>
  );
}
