import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, PiggyBank, Plus, RefreshCw, Search, X } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { DeleteInstallmentDialog } from './components/DeleteInstallmentDialog';
import { InstallmentFormDialog } from './components/InstallmentFormDialog';
import { InstallmentTable } from './components/InstallmentTable';
import { RekapSheet } from './components/RekapSheet';
import { useInstallmentListQuery } from './hooks';
import type { CicilanSearch } from './searchSchema';
import type { InstallmentListParams, InstallmentRule, InstallmentSortField } from './types';

const PAGE_SIZES = [10, 25, 50, 100];
// Radix Select forbids empty-string values — sentinel for "Semua Status".
const ALL = '__all';

export function CicilanDepositPage({
  search,
  onPatch,
}: {
  search: CicilanSearch;
  onPatch: (patch: Partial<CicilanSearch>) => void;
}) {
  const params: InstallmentListParams = {
    status: search.status,
    search: search.q,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    page: search.page,
    pageSize: search.pageSize,
  };

  const list = useInstallmentListQuery(params);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<InstallmentRule | null>(null);
  const [deleting, setDeleting] = useState<InstallmentRule | null>(null);
  const [rekap, setRekap] = useState<InstallmentRule | null>(null);

  // free-text search: local state, debounced into the URL (and the query key)
  const [searchText, setSearchText] = useState(search.q ?? '');
  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? '') !== searchText.trim()) {
        onPatch({ q: searchText.trim() || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchText, search.q, onPatch]);

  const toggleSort = (field: InstallmentSortField) =>
    onPatch(
      search.sortBy === field
        ? { sortOrder: search.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 }
        : { sortBy: field, sortOrder: 'asc', page: 1 },
    );

  const meta = list.data?.meta;
  const total = meta?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / search.pageSize));
  const from = total === 0 ? 0 : (search.page - 1) * search.pageSize + 1;
  const to = Math.min(search.page * search.pageSize, total);
  const isFiltered = Boolean(search.q || search.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Cicilan Deposit</h2>
          <p className="text-sm text-muted-foreground">
            Kelola cicilan deposit driver — potongan dihitung otomatis dari hari aktif pada data
            Fleet Monitoring.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden />
          Tambah Data
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={search.status ?? ALL}
          onValueChange={(v) =>
            onPatch({ status: v === ALL ? undefined : (v as 'berjalan' | 'lunas'), page: 1 })
          }
        >
          <SelectTrigger size="sm" className="w-36" aria-label="Filter status cicilan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Status</SelectItem>
            <SelectItem value="berjalan">Berjalan</SelectItem>
            <SelectItem value="lunas">Lunas</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">Entri:</span>
          <Select
            value={String(search.pageSize)}
            onValueChange={(v) => onPatch({ pageSize: Number(v), page: 1 })}
          >
            <SelectTrigger size="sm" className="w-20" aria-label="Entri per halaman">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void list.refetch()}
            disabled={list.isFetching}
          >
            <RefreshCw className={list.isFetching ? 'animate-spin' : undefined} aria-hidden />
            Refresh
          </Button>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cari judul / driver / plat…"
              aria-label="Cari judul, driver, atau plat"
              className="h-8 w-full pr-8 pl-8 sm:w-56"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                aria-label="Hapus pencarian"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {list.isPending && (
            <div className="space-y-2 p-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}
          {list.isError && (
            <p className="px-4 py-8 text-center text-sm text-destructive" role="alert">
              Gagal memuat: {list.error.message}
            </p>
          )}
          {list.isSuccess && list.data.data.length === 0 && (
            <EmptyState
              icon={PiggyBank}
              title={isFiltered ? 'Tidak ada cicilan yang cocok' : 'Belum ada cicilan deposit'}
              description={
                isFiltered
                  ? 'Coba ubah kata kunci pencarian atau filter status.'
                  : 'Buat aturan cicilan untuk mulai memotong deposit driver secara otomatis dari hari aktifnya.'
              }
              action={
                isFiltered ? undefined : (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus aria-hidden />
                    Tambah Data
                  </Button>
                )
              }
            />
          )}
          {list.isSuccess && list.data.data.length > 0 && (
            <div className={list.isFetching ? 'opacity-70 transition-opacity' : undefined}>
              <InstallmentTable
                rows={list.data.data}
                sortBy={search.sortBy}
                sortOrder={search.sortOrder}
                onSort={toggleSort}
                onRekap={setRekap}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {list.isSuccess && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Menampilkan {from}–{to} dari {total} cicilan
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Halaman sebelumnya"
              disabled={search.page <= 1}
              onClick={() => onPatch({ page: search.page - 1 })}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-20 text-center">
              Hal. {search.page} / {lastPage}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Halaman berikutnya"
              disabled={search.page >= lastPage}
              onClick={() => onPatch({ page: search.page + 1 })}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      {(createOpen || editing != null) && (
        <InstallmentFormDialog
          key={editing?.id ?? 'create'}
          open
          initial={editing}
          onClose={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
        />
      )}
      <DeleteInstallmentDialog rule={deleting} onClose={() => setDeleting(null)} />
      <RekapSheet rule={rekap} onClose={() => setRekap(null)} />
    </div>
  );
}
