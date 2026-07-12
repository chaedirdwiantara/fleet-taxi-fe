import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CameraDialog } from './CameraDialog';
import { resolveMediaUrl, useDeleteMedia, useUploadMedia } from './hooks';
import type { CheckpointMedia, PointKey } from './types';

// Touch devices get the native camera app via `<input capture>`; on desktop
// that attribute silently degrades to a file picker, so there the Kamera
// button opens a getUserMedia webcam dialog instead.
const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

// Photo evidence for one inspection point: camera capture + gallery pick,
// thumbnail grid with full-screen preview, per-photo delete while a draft.
export function PhotoCapture({
  checkpointId,
  pointKey,
  media,
  readOnly,
}: {
  checkpointId: number;
  pointKey: PointKey;
  media: CheckpointMedia[];
  readOnly: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CheckpointMedia | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const upload = useUploadMedia(checkpointId);
  const remove = useDeleteMedia(checkpointId);

  const photos = media.filter((m) => m.kind === 'photo' && m.status === 'uploaded');

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      upload.mutate({ kind: 'photo', pointKey, blob: file });
    }
  };

  const openCamera = () => {
    if (isTouchDevice()) cameraRef.current?.click();
    else setWebcamOpen(true);
  };

  return (
    <div className="space-y-2">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((m) => (
          <div key={m.id} className="group relative aspect-square">
            <button
              type="button"
              className="size-full overflow-hidden rounded-md border bg-muted"
              onClick={() => setPreview(m)}
              aria-label="Lihat foto"
            >
              <img
                src={resolveMediaUrl(m.url)}
                alt="Foto inspeksi"
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
            {!readOnly && (
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                aria-label="Hapus foto"
                className="absolute -right-1.5 -top-1.5 size-6 rounded-full shadow"
                disabled={remove.isPending}
                onClick={() => remove.mutate(m.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        ))}

        {!readOnly && (
          <div className="flex aspect-square flex-col gap-1.5">
            <button
              type="button"
              className="flex flex-1 min-h-11 items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              onClick={openCamera}
              disabled={upload.isPending}
            >
              {upload.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-4" aria-hidden />
              )}
              Kamera
            </button>
            <button
              type="button"
              className="flex flex-1 min-h-11 items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              onClick={() => galleryRef.current?.click()}
              disabled={upload.isPending}
            >
              <ImageIcon className="size-4" aria-hidden />
              Galeri
            </button>
          </div>
        )}
      </div>

      {photos.length === 0 && readOnly && (
        <p className="text-xs text-muted-foreground">Tidak ada foto.</p>
      )}
      {upload.isError && (
        <p className="text-xs text-destructive" role="alert">
          {upload.error.message}
        </p>
      )}

      <Dialog open={preview != null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl p-2" showCloseButton={false}>
          <DialogTitle className="sr-only">Pratinjau foto</DialogTitle>
          {preview && (
            <img
              src={resolveMediaUrl(preview.url)}
              alt="Foto inspeksi (pratinjau penuh)"
              className="max-h-[80svh] w-full rounded object-contain"
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Tutup"
            className="absolute right-3 top-3"
            onClick={() => setPreview(null)}
          >
            <X className="size-4" />
          </Button>
        </DialogContent>
      </Dialog>

      <CameraDialog
        open={webcamOpen}
        onOpenChange={setWebcamOpen}
        onCapture={(blob) => upload.mutate({ kind: 'photo', pointKey, blob })}
      />
    </div>
  );
}
