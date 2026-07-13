import { useRef } from 'react';
import { ExternalLink, FileText, Loader2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveMediaUrl, useUploadDriverDocument } from '../hooks';
import { DOC_KIND_LABELS, type DriverDocument, type DriverDocumentKind } from '../types';

// One card per document kind: upload (replaces the previous of its kind) and
// preview link. `readOnly` locks settled documents (e.g. a returned deposit).
export function DocumentUploadCard({
  driverId,
  kind,
  document,
  readOnly = false,
}: {
  driverId: number;
  kind: DriverDocumentKind;
  document?: DriverDocument;
  readOnly?: boolean;
}) {
  const upload = useUploadDriverDocument(driverId);
  const inputRef = useRef<HTMLInputElement>(null);
  const label = DOC_KIND_LABELS[kind];
  const uploaded = document?.status === 'uploaded';

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (file) upload.mutate({ kind, file });
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {uploaded ? (
          <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            Terunggah
          </Badge>
        ) : (
          <Badge variant="outline">Belum diunggah</Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {uploaded && document?.url && (
          <Button variant="outline" size="sm" asChild>
            <a href={resolveMediaUrl(document.url)} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden />
              Lihat
            </a>
          </Button>
        )}
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              aria-label={`Pilih file ${label}`}
              onChange={pickFile}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {upload.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Upload aria-hidden />
              )}
              {upload.isPending ? 'Mengunggah…' : uploaded ? 'Ganti' : 'Unggah'}
            </Button>
          </>
        )}
      </div>

      {upload.isError && (
        <p className="text-sm text-destructive" role="alert">
          {upload.error.message}
        </p>
      )}
    </div>
  );
}
