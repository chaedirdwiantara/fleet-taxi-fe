import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Camera, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateCheckpointDialog } from '@/features/partner/checkpoint/CreateCheckpointDialog';
import { useCheckpointsQuery } from '@/features/partner/checkpoint/hooks';
import {
  HANDOVER_LABELS,
  HANDOVER_TYPES,
  type CheckpointSummary,
} from '@/features/partner/checkpoint/types';
import { formatDateTimeWIB } from '@/lib/datetime';

// Checkpoint — dokumentasi serah terima kendaraan. Mobile-first card list;
// inspections happen outdoors on a phone.
export const Route = createFileRoute('/_partner/partner/checkpoint/')({
  component: CheckpointListPage,
});

const ALL = 'all';

function CheckpointListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(ALL);
  const [handoverType, setHandoverType] = useState(ALL);
  const [createOpen, setCreateOpen] = useState(false);

  const list = useCheckpointsQuery({
    page,
    status: status === ALL ? undefined : status,
    handoverType: handoverType === ALL ? undefined : handoverType,
  });

  const total = list.data?.meta?.total ?? 0;
  const pageSize = list.data?.meta?.pageSize ?? 50;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Checkpoint</h2>
          <p className="text-sm text-muted-foreground">
            Dokumentasi serah terima kendaraan: foto tiap titik, penilaian, tanda tangan, dan
            berita acara.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus aria-hidden />
          <span className="hidden sm:inline">Checkpoint Baru</span>
          <span className="sm:hidden">Baru</span>
        </Button>
      </div>

      <div className="flex gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="flex-1" aria-label="Filter status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={handoverType}
          onValueChange={(v) => {
            setHandoverType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="flex-1" aria-label="Filter jenis serah terima">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua jenis</SelectItem>
            {HANDOVER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {HANDOVER_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {list.isPending && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {list.isError && (
        <p className="text-sm text-destructive">Gagal memuat: {list.error.message}</p>
      )}
      {list.isSuccess && list.data.rows.length === 0 && (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center gap-2 text-center">
            <Camera className="size-8 text-muted-foreground/50" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Belum ada checkpoint. Mulai dokumentasi serah terima pertama Anda.
            </p>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden /> Checkpoint Baru
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {list.data?.rows.map((cp) => <CheckpointCard key={cp.id} checkpoint={cp} />)}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-xs text-muted-foreground">
            Halaman {page} dari {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= lastPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}

      <CreateCheckpointDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CheckpointCard({ checkpoint }: { checkpoint: CheckpointSummary }) {
  return (
    <Link
      to="/partner/checkpoint/$id"
      params={{ id: String(checkpoint.id) }}
      className="block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Card className="py-3 transition-colors hover:bg-accent/40">
        <CardContent className="flex items-center gap-3 px-4">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{checkpoint.plateNumber}</span>
              <Badge variant={checkpoint.status === 'completed' ? 'default' : 'secondary'}>
                {checkpoint.status === 'completed' ? 'Selesai' : 'Draft'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {HANDOVER_LABELS[checkpoint.handoverType]}
              {checkpoint.counterpartName ? ` · ${checkpoint.counterpartName}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTimeWIB(checkpoint.completedAt ?? checkpoint.createdAt)} ·{' '}
              {checkpoint.photoCount} foto
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </CardContent>
      </Card>
    </Link>
  );
}
