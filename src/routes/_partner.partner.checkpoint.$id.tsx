import { useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle2, FileDown, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CompleteSheet } from '@/features/partner/checkpoint/CompleteSheet';
import { PointCard } from '@/features/partner/checkpoint/PointCard';
import {
  downloadCheckpointPdf,
  resolveMediaUrl,
  useCheckpointQuery,
  useComparisonQuery,
  useDeleteCheckpoint,
} from '@/features/partner/checkpoint/hooks';
import {
  HANDOVER_LABELS,
  RETURN_TYPES,
  type CheckpointDetail,
  type CheckpointPoint,
} from '@/features/partner/checkpoint/types';
import { formatDateTimeWIB } from '@/lib/datetime';

export const Route = createFileRoute('/_partner/partner/checkpoint/$id')({
  component: CheckpointDetailPage,
});

function CheckpointDetailPage() {
  const { id } = Route.useParams();
  const checkpointId = Number(id);
  const detail = useCheckpointQuery(checkpointId);

  if (detail.isPending) {
    return <p className="text-sm text-muted-foreground">Memuat…</p>;
  }
  if (detail.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Gagal memuat: {detail.error.message}</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/partner/checkpoint">
            <ArrowLeft aria-hidden /> Kembali
          </Link>
        </Button>
      </div>
    );
  }
  return <CheckpointDetailView detail={detail.data} />;
}

function CheckpointDetailView({ detail }: { detail: CheckpointDetail }) {
  const navigate = useNavigate();
  const isDraft = detail.status === 'draft';
  const isReturn = RETURN_TYPES.includes(detail.handoverType);
  const comparison = useComparisonQuery(detail.id, isReturn);
  const remove = useDeleteCheckpoint();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const comparisonByKey = useMemo(() => {
    const map = new Map<string, CheckpointPoint>();
    for (const p of comparison.data?.points ?? []) map.set(p.pointKey, p);
    return map;
  }, [comparison.data]);

  const assessed = detail.points.filter((p) => p.passed !== null).length;
  const photographed = detail.points.filter((p) =>
    p.media.some((m) => m.kind === 'photo' && m.status === 'uploaded'),
  ).length;

  const download = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadCheckpointPdf(detail.id);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Gagal mengunduh');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-20">
      {/* Sticky progress header: keeps plate + progress visible mid-inspection */}
      <div className="sticky top-14 z-10 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur md:-mx-6 md:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild aria-label="Kembali ke daftar">
            <Link to="/partner/checkpoint">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{detail.plateNumber}</span>
              <Badge variant={isDraft ? 'secondary' : 'default'}>
                {isDraft ? 'Draft' : 'Selesai'}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {HANDOVER_LABELS[detail.handoverType]}
            </p>
          </div>
          {isDraft && (
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {assessed}/{detail.points.length} titik
            </span>
          )}
          {isDraft && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Hapus draft ini"
                  className="min-h-9 min-w-9 shrink-0 text-destructive hover:bg-destructive/10"
                  disabled={remove.isPending}
                >
                  {remove.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus draft checkpoint ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Draft {detail.plateNumber} ({HANDOVER_LABELS[detail.handoverType]}) beserta
                    seluruh foto dan penilaian di dalamnya akan dihapus permanen dan tidak bisa
                    dikembalikan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      remove.mutate(detail.id, {
                        onSuccess: () => void navigate({ to: '/partner/checkpoint' }),
                      })
                    }
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Hapus Draft
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {remove.isError && (
        <p className="text-sm text-destructive" role="alert">
          {remove.error.message}
        </p>
      )}

      <Card className="py-4">
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 text-sm">
          <Info label="Pihak Penerima/Penyerah" value={detail.counterpartName ?? '-'} />
          <Info label="Telepon" value={detail.counterpartPhone ?? '-'} />
          <Info
            label="Odometer"
            value={detail.odometerKm != null ? `${detail.odometerKm.toLocaleString('id-ID')} km` : '-'}
          />
          <Info
            label="Baterai"
            value={detail.batteryPercent != null ? `${detail.batteryPercent}%` : '-'}
          />
          <Info label="Dibuat" value={formatDateTimeWIB(detail.createdAt)} />
          <Info
            label="Selesai"
            value={detail.completedAt ? formatDateTimeWIB(detail.completedAt) : '-'}
          />
          {detail.generalNotes && (
            <div className="col-span-2">
              <Info label="Catatan Umum" value={detail.generalNotes} />
            </div>
          )}
        </CardContent>
      </Card>

      {isReturn && comparison.isSuccess && comparison.data === null && (
        <p className="text-xs text-muted-foreground">
          Tidak ada checkpoint penyerahan sebelumnya untuk plat ini — perbandingan tidak tersedia.
        </p>
      )}

      <div className="space-y-3">
        {detail.points.map((point, i) => (
          <PointCard
            key={point.pointKey}
            checkpointId={detail.id}
            index={i}
            point={point}
            readOnly={!isDraft}
            comparisonPoint={comparisonByKey.get(point.pointKey)}
          />
        ))}
      </div>

      {!isDraft && detail.signatures.length > 0 && (
        <Card className="py-4">
          <CardContent className="px-4">
            <h3 className="mb-3 text-sm font-semibold">Tanda Tangan</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['signature_partner', 'signature_counterpart'] as const).map((kind) => {
                const sig = detail.signatures.find(
                  (s) => s.kind === kind && s.status === 'uploaded',
                );
                return (
                  <div key={kind} className="space-y-1 text-center">
                    {sig ? (
                      <img
                        src={resolveMediaUrl(sig.url)}
                        alt={
                          kind === 'signature_partner'
                            ? 'Tanda tangan petugas partner'
                            : 'Tanda tangan pihak penerima/penyerah'
                        }
                        className="mx-auto h-24 rounded border bg-white object-contain"
                      />
                    ) : (
                      <div className="mx-auto h-24 rounded border border-dashed" />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {kind === 'signature_partner' ? 'Petugas Partner' : 'Penerima/Penyerah'}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {downloadError && (
        <p className="text-sm text-destructive" role="alert">
          {downloadError}
        </p>
      )}

      {/* Sticky bottom action bar — thumb-reachable on phones */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 p-3 backdrop-blur md:left-60">
        <div className="mx-auto max-w-2xl">
          {isDraft ? (
            <Button className="h-12 w-full" onClick={() => setCompleteOpen(true)}>
              <CheckCircle2 aria-hidden />
              Selesaikan Checkpoint ({assessed}/{detail.points.length} dinilai ·{' '}
              {photographed}/{detail.points.length} difoto)
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-12 w-full"
              onClick={() => void download()}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <FileDown aria-hidden />
              )}
              Unduh Berita Acara (PDF)
            </Button>
          )}
        </div>
      </div>

      <CompleteSheet
        checkpointId={detail.id}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
