import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Camera, ChevronRight, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateCheckpointDialog } from '@/features/partner/checkpoint/CreateCheckpointDialog';
import { useCheckpointsQuery, useDeleteCheckpoint } from '@/features/partner/checkpoint/hooks';
import {
  HANDOVER_LABELS,
  HANDOVER_TYPES,
  type CheckpointSummary,
} from '@/features/partner/checkpoint/types';
import { currentYearWIB, formatDateTimeWIB, MONTH_NAMES_ID } from '@/lib/datetime';

// Checkpoint — dokumentasi serah terima kendaraan. Mobile-first card list;
// inspections happen outdoors on a phone.
export const Route = createFileRoute('/_partner/partner/checkpoint/')({
  component: CheckpointListPage,
});

const ALL = 'all';
// This year plus a few back — checkpoints only exist from 2026 onward
const YEAR_OPTIONS = Array.from({ length: 3 }, (_, i) => currentYearWIB() - i).filter(
  (y) => y >= 2026,
);

function CheckpointListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(ALL);
  const [handoverType, setHandoverType] = useState(ALL);
  const [month, setMonth] = useState(ALL); // '1'..'12' | ALL
  const [year, setYear] = useState(String(currentYearWIB()));
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useCheckpointsQuery({
    page,
    plate: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
    handoverType: handoverType === ALL ? undefined : handoverType,
    ...(month !== ALL && { month: Number(month), year: Number(year) }),
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

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor plat… (mis. 2437 atau B 2437 SNC)"
          aria-label="Cari riwayat checkpoint berdasarkan plat"
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Bersihkan pencarian"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setSearch('')}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full" aria-label="Filter status">
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
          <SelectTrigger className="w-full" aria-label="Filter jenis serah terima">
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
        <Select
          value={month}
          onValueChange={(v) => {
            setMonth(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full" aria-label="Filter bulan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua bulan</SelectItem>
            {MONTH_NAMES_ID.map((name, i) => (
              <SelectItem key={name} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={year}
          onValueChange={(v) => {
            setYear(v);
            setPage(1);
          }}
          disabled={month === ALL}
        >
          <SelectTrigger className="w-full" aria-label="Filter tahun">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
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
            {debouncedSearch || status !== ALL || handoverType !== ALL || month !== ALL ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada checkpoint yang cocok dengan pencarian/filter.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Belum ada checkpoint. Mulai dokumentasi serah terima pertama Anda.
                </p>
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus aria-hidden /> Checkpoint Baru
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {list.isSuccess && total > 0 && (
        <p className="text-xs text-muted-foreground">{total} checkpoint ditemukan</p>
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
  const remove = useDeleteCheckpoint();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
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
            {/* Completed checkpoints are berita acara — no delete offered */}
            {checkpoint.status === 'draft' && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Hapus draft ${checkpoint.plateNumber}`}
                className="min-h-9 min-w-9 shrink-0 text-destructive hover:bg-destructive/10"
                disabled={remove.isPending}
                onClick={(e) => {
                  // Stop the wrapping Link from navigating; the dialog is
                  // controlled state, so preventDefault can't swallow it.
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmOpen(true);
                }}
              >
                {remove.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            )}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </CardContent>
        </Card>
      </Link>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus draft checkpoint ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Draft {checkpoint.plateNumber} ({HANDOVER_LABELS[checkpoint.handoverType]}) beserta{' '}
              {checkpoint.photoCount} foto di dalamnya akan dihapus permanen dan tidak bisa
              dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => remove.mutate(checkpoint.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
