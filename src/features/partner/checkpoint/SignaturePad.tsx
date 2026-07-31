import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  clear: () => void;
  /** PNG of the drawn signature (white background), or null when empty. */
  toBlob: () => Promise<Blob | null>;
}

// Hand-rolled canvas signature pad: Pointer Events (pen/finger/mouse),
// devicePixelRatio-aware so strokes stay crisp, `touch-action: none` so
// drawing doesn't scroll the page. `signerName` is the party signing here —
// it is printed under the signature on the berita acara.
export function SignaturePad({
  label,
  signerName,
  disabled = false,
  ref,
  className,
}: {
  label: string;
  signerName?: string | null;
  disabled?: boolean;
  ref: Ref<SignaturePadHandle>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    hasInk.current = false;
  }, []);

  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // A dot for taps, so even the shortest touch leaves ink
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    hasInk.current = true;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onPointerUp = () => {
    drawing.current = false;
  };

  useImperativeHandle(ref, () => ({
    isEmpty: () => !hasInk.current,
    clear: setupCanvas,
    toBlob: () =>
      new Promise<Blob | null>((resolve) => {
        if (!hasInk.current || !canvasRef.current) return resolve(null);
        canvasRef.current.toBlob((b) => resolve(b), 'image/png');
      }),
  }));

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-medium">{label}</span>
          <p className="truncate text-xs text-muted-foreground">
            {signerName?.trim() || 'Nama belum diisi'}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-muted-foreground"
          disabled={disabled}
          onClick={setupCanvas}
        >
          <Eraser className="size-3.5" aria-hidden />
          Hapus
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Area tanda tangan: ${label}`}
        aria-disabled={disabled}
        className={cn(
          'h-36 w-full touch-none rounded-md border border-dashed border-input bg-white',
          disabled && 'pointer-events-none opacity-40',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
}
