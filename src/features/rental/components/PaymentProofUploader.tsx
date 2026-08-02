import { useId, useRef, useState } from 'react';
import { ExternalLink, FileText, ImageIcon, Loader2, Paperclip, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTimeWIB } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import {
  ALLOWED_PROOF_TYPES,
  MAX_PROOFS,
  resolveMediaUrl,
  useDeleteRentalProof,
  useUploadRentalProof,
} from '../hooks';
import type { RentalPaymentProof } from '../types';

const ACCEPT = ALLOWED_PROOF_TYPES.join(',');

/** Human-readable file size; bytes are a display detail, not money. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
}

/**
 * Collects the payment evidence for a rental. Controlled: the parent owns the
 * list and sends the ids with its own save call, which is what lets the add
 * form gather proofs before the rental row exists.
 *
 * Uploads run one file at a time through presign → PUT → confirm; each file
 * carries the backend's snapshot of who uploaded it, shown under the name.
 */
export function PaymentProofUploader({
  proofs,
  onChange,
  disabled = false,
}: {
  proofs: RentalPaymentProof[];
  onChange: (next: RentalPaymentProof[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const upload = useUploadRentalProof();
  const remove = useDeleteRentalProof();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const full = proofs.length >= MAX_PROOFS;
  const busy = upload.isPending || remove.isPending;
  const locked = disabled || busy;

  const addFiles = async (files: File[]) => {
    setError(null);
    const room = MAX_PROOFS - proofs.length;
    if (room <= 0) {
      setError(`Maksimal ${MAX_PROOFS} file bukti per transaksi.`);
      return;
    }
    if (files.length > room) {
      setError(`Hanya ${room} file lagi yang bisa ditambahkan (maksimal ${MAX_PROOFS}).`);
    }

    // Sequential: each upload is three round-trips, and a partial failure
    // should leave the files before it already attached rather than unwind.
    const added: RentalPaymentProof[] = [];
    for (const file of files.slice(0, room)) {
      try {
        added.push(await upload.mutateAsync(file));
      } catch (e) {
        setError(e instanceof Error ? e.message : `Gagal mengunggah ${file.name}`);
        break;
      }
    }
    if (added.length) onChange([...proofs, ...added]);
  };

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = ''; // allow re-picking the same file
    if (files.length) void addFiles(files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (locked || full) return;
    const files = [...e.dataTransfer.files].filter((f) => ALLOWED_PROOF_TYPES.includes(f.type));
    if (files.length === 0) {
      setError('Format file tidak didukung (JPG, PNG, atau PDF).');
      return;
    }
    void addFiles(files);
  };

  const removeProof = async (proof: RentalPaymentProof) => {
    setError(null);
    try {
      await remove.mutateAsync(proof.id);
      onChange(proofs.filter((p) => p.id !== proof.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus bukti');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Paperclip className="size-4 text-muted-foreground" aria-hidden />
          Bukti Pembayaran
        </span>
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {proofs.length} / {MAX_PROOFS} file
        </span>
      </div>

      {proofs.length > 0 && (
        <ul className="space-y-2">
          {proofs.map((proof) => (
            <li
              key={proof.id}
              className="flex items-start gap-3 rounded-lg border bg-card p-2.5 sm:items-center"
            >
              <ProofThumb proof={proof} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={proof.fileName}>
                  {proof.fileName}
                </p>
                <p className="text-xs text-muted-foreground">{formatBytes(proof.sizeBytes)}</p>
                {/* The audit line: who put this here, and when. */}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Diunggah oleh{' '}
                  <span className="font-medium text-foreground">
                    {proof.uploadedByName || proof.uploadedByEmail}
                  </span>{' '}
                  · {formatDateTimeWIB(proof.uploadedAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {proof.url && (
                  <Button variant="ghost" size="icon-sm" asChild>
                    <a
                      href={resolveMediaUrl(proof.url)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Lihat ${proof.fileName}`}
                      title="Lihat"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10"
                  disabled={locked}
                  aria-label={`Hapus ${proof.fileName}`}
                  title="Hapus"
                  onClick={() => void removeProof(proof)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!full && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!locked) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'rounded-lg border border-dashed px-4 py-4 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'bg-muted/40',
          )}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            aria-label="Pilih file bukti pembayaran"
            disabled={locked}
            onChange={pickFiles}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={locked}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Upload aria-hidden />
            )}
            {upload.isPending ? 'Mengunggah…' : proofs.length ? 'Tambah File' : 'Pilih File'}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            JPG, PNG, atau PDF · maksimal {MAX_PROOFS} file
            <span className="hidden sm:inline"> · seret file ke sini</span>
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Image proofs preview inline; PDFs get an icon tile. A thumbnail that fails
 * to load (expired presigned URL, offline) falls back to the tile rather than
 * leaving an empty box.
 */
function ProofThumb({ proof }: { proof: RentalPaymentProof }) {
  const [broken, setBroken] = useState(false);
  const isImage = proof.contentType.startsWith('image/');

  if (isImage && proof.url && !broken) {
    return (
      <img
        src={resolveMediaUrl(proof.url)}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className="size-10 shrink-0 rounded-md border object-cover"
      />
    );
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted">
      {isImage ? (
        <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
      ) : (
        <FileText className="size-4 text-muted-foreground" aria-hidden />
      )}
    </span>
  );
}
