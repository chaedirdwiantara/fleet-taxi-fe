import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PhotoCapture } from './PhotoCapture';
import { resolveMediaUrl, useUpdatePoint } from './hooks';
import { POINT_HINTS, type CheckpointPoint } from './types';

// One inspection point: status dot, big Lulus/Gagal touch targets (tri-state:
// null until the inspector decides), photo grid, debless note (PATCH on blur),
// and — on return checkpoints — a collapsible before/after comparison strip.
export function PointCard({
  checkpointId,
  index,
  point,
  readOnly,
  comparisonPoint,
}: {
  checkpointId: number;
  index: number;
  point: CheckpointPoint;
  readOnly: boolean;
  comparisonPoint?: CheckpointPoint | null;
}) {
  const updatePoint = useUpdatePoint(checkpointId);
  const [note, setNote] = useState(point.note ?? '');
  const [showComparison, setShowComparison] = useState(false);

  const saveNote = () => {
    if ((point.note ?? '') !== note.trim()) {
      updatePoint.mutate({ pointKey: point.pointKey, note: note.trim() });
    }
  };

  const comparisonPhotos =
    comparisonPoint?.media.filter((m) => m.kind === 'photo' && m.status === 'uploaded') ?? [];

  return (
    <Card className="py-4" id={`point-${point.pointKey}`}>
      <CardContent className="space-y-3 px-4">
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className={cn(
              'mt-1 size-2.5 shrink-0 rounded-full',
              point.passed === true && 'bg-emerald-500',
              point.passed === false && 'bg-destructive',
              point.passed === null && 'bg-muted-foreground/30',
            )}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm leading-tight font-semibold">
              {index + 1}. {point.label}
            </h3>
            <p className="text-xs text-muted-foreground">{POINT_HINTS[point.pointKey]}</p>
          </div>
        </div>

        {!readOnly ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={point.passed === true ? 'default' : 'outline'}
              className={cn(
                'h-11',
                point.passed === true && 'bg-emerald-600 text-white hover:bg-emerald-600/90',
              )}
              disabled={updatePoint.isPending}
              onClick={() => updatePoint.mutate({ pointKey: point.pointKey, passed: true })}
            >
              <Check aria-hidden /> Lulus
            </Button>
            <Button
              type="button"
              variant={point.passed === false ? 'destructive' : 'outline'}
              className="h-11"
              disabled={updatePoint.isPending}
              onClick={() => updatePoint.mutate({ pointKey: point.pointKey, passed: false })}
            >
              <X aria-hidden /> Gagal
            </Button>
          </div>
        ) : (
          <p
            className={cn(
              'text-sm font-medium',
              point.passed
                ? 'text-emerald-600'
                : point.passed === false
                  ? 'text-destructive'
                  : 'text-muted-foreground',
            )}
          >
            {point.passed
              ? 'Lulus inspeksi'
              : point.passed === false
                ? 'Tidak lulus inspeksi'
                : 'Belum dinilai'}
          </p>
        )}

        <PhotoCapture
          checkpointId={checkpointId}
          pointKey={point.pointKey}
          media={point.media}
          readOnly={readOnly}
        />

        {!readOnly ? (
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            placeholder="Keterangan (opsional) — mis. baret halus di pintu"
            maxLength={1000}
            className="min-h-11"
          />
        ) : (
          point.note && <p className="text-sm">Catatan: {point.note}</p>
        )}

        {comparisonPhotos.length > 0 && (
          <div className="rounded-md border bg-muted/40 p-2">
            <button
              type="button"
              className="flex min-h-9 w-full items-center justify-between text-xs font-medium text-muted-foreground"
              onClick={() => setShowComparison((s) => !s)}
              aria-expanded={showComparison}
            >
              Bandingkan dengan serah terima sebelumnya ({comparisonPhotos.length} foto)
              <ChevronDown
                aria-hidden
                className={cn('size-4 transition-transform', showComparison && 'rotate-180')}
              />
            </button>
            {showComparison && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {comparisonPhotos.map((m) => (
                  <img
                    key={m.id}
                    src={resolveMediaUrl(m.url)}
                    alt={`Foto sebelumnya — ${point.label}`}
                    loading="lazy"
                    className="h-24 w-32 shrink-0 rounded border object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
