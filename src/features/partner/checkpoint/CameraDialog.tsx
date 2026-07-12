import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Webcam capture for desktop. On phones the native `<input capture>` opens
 * the camera app directly, but desktop browsers treat that input as a plain
 * file picker — so there we open the webcam via getUserMedia instead and
 * snapshot a frame to a JPEG blob.
 */
export function CameraDialog({
  open,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (blob: Blob) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ambil Foto</DialogTitle>
          <DialogDescription>
            Arahkan kamera ke titik inspeksi, lalu klik Ambil Foto.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open: mount starts the stream, unmount stops it */}
        {open && (
          <CameraView
            onCapture={(blob) => {
              onCapture(blob);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CameraView({
  onCapture,
  onCancel,
}: {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
        setStarting(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStarting(false);
        setError(
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Izin kamera ditolak — izinkan akses kamera di browser, atau gunakan tombol Galeri untuk memilih file.'
            : 'Kamera tidak tersedia di perangkat ini — gunakan tombol Galeri untuk memilih file.',
        );
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <>
      {error ? (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : (
        <div className="relative aspect-video overflow-hidden rounded-md bg-black">
          <video ref={videoRef} playsInline muted className="size-full object-contain" />
          {starting && (
            <div className="absolute inset-0 grid place-content-center text-white">
              <Loader2 className="size-6 animate-spin" aria-label="Menyalakan kamera" />
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="button" onClick={capture} disabled={!!error || starting}>
          <Camera aria-hidden /> Ambil Foto
        </Button>
      </DialogFooter>
    </>
  );
}
