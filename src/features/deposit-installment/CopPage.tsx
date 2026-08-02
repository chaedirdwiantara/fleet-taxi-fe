import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Car, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchInput } from '@/components/shared/SearchInput';
import { CopTable } from './components/CopTable';
import { RekapSheet } from './components/RekapSheet';
import { useCopListQuery } from './hooks';
import { cicilanSearchSchema } from './searchSchema';
import type { CopSearch } from './copSearchSchema';
import type { CopListParams, CopRow, CopSortField } from './types';

const PAGE_SIZES = [10, 25, 50, 100];
// Radix Select forbids empty-string values — sentinel for "Semua Status".
const ALL = '__all';
// The Cicilan route requires its full search params; take them from that
// route's own schema so the two never drift.
const CICILAN_SEARCH = cicilanSearchSchema.parse({});

/**
 * Car Ownership Program — a REPORT over the COP-titled rows of the Cicilan
 * menu. Read-only by design: the programme is configured there, this page only
 * presents it. Every figure (kewajiban, tertarik, outstanding, gap) is computed
 * by the backend from the same daily ledger.
 */
export function CopPage({
  search,
  onPatch,
}: {
  search: CopSearch;
  onPatch: (patch: Partial<CopSearch>) => void;
}) {
  const params: CopListParams = {
    status: search.status,
    search: search.q,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    page: search.page,
    pageSize: search.pageSize,
  };

  const list = useCopListQuery(params);
  const [rekap, setRekap] = useState<CopRow | null>(null);

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

  const toggleSort = (field: CopSortField) =>
    onPatch(
      search.sortBy === field
        ? { sortOrder: search.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 }
        : { sortBy: field, sortOrder: 'desc', page: 1 },
    );

  const total = list.data?.meta?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / search.pageSize));
  const from = total === 0 ? 0 : (search.page - 1) * search.pageSize + 1;
  const to = Math.min(search.page * search.pageSize, total);
  const isFiltered = Boolean(search.q || search.status);

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">Car Ownership Program</h2>
        <p className="text-sm text-muted-foreground">
          Rekap program kepemilikan kendaraan driver. Datanya diambil dari menu{' '}
          <Link
            to="/partner/cicilan"
            search={CICILAN_SEARCH}
            className="font-medium text-primary hover:underline"
          >
            Cicilan
          </Link>{' '}
          berjudul COP — potongan harian dihitung otomatis dari hari aktif driver pada data Fleet
          Monitoring.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={searchText}
          onChange={setSearchText}
          placeholder="Cari driver / plat…"
          label="Cari driver atau plat"
          className="w-full sm:w-72"
        />

        <Select
          value={search.status ?? ALL}
          onValueChange={(v) =>
            onPatch({ status: v === ALL ? undefined : (v as 'berjalan' | 'lunas'), page: 1 })
          }
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter status program">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Status</SelectItem>
            <SelectItem value="berjalan">Berjalan</SelectItem>
            <SelectItem value="lunas">Lunas</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-sm whitespace-nowrap text-muted-foreground">Entri:</span>
          <Select
            value={String(search.pageSize)}
            onValueChange={(v) => onPatch({ pageSize: Number(v), page: 1 })}
          >
            <SelectTrigger className="w-20" aria-label="Entri per halaman">
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
          <Button
            variant="outline"
            onClick={() => void list.refetch()}
            disabled={list.isFetching}
            className="ml-auto sm:ml-0"
          >
            <RefreshCw className={list.isFetching ? 'animate-spin' : undefined} aria-hidden />
            Refresh
          </Button>
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
              icon={Car}
              title={isFiltered ? 'Tidak ada program yang cocok' : 'Belum ada driver COP'}
              description={
                isFiltered
                  ? 'Coba ubah kata kunci pencarian atau filter status.'
                  : 'Program muncul di sini setelah Anda menambah cicilan berjudul COP (Car Ownership Program) di menu Cicilan.'
              }
              action={
                isFiltered ? undefined : (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/partner/cicilan" search={CICILAN_SEARCH}>
                      Buka menu Cicilan
                    </Link>
                  </Button>
                )
              }
            />
          )}
          {list.isSuccess && list.data.data.length > 0 && (
            <div className={list.isFetching ? 'opacity-70 transition-opacity' : undefined}>
              <CopTable
                rows={list.data.data}
                sortBy={search.sortBy}
                sortOrder={search.sortOrder}
                onSort={toggleSort}
                onRekap={setRekap}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {list.isSuccess && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Menampilkan {from}–{to} dari {total} program COP
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

      {/* A CopRow IS an InstallmentRule, so the Cicilan rekap sheet fits as-is. */}
      <RekapSheet rule={rekap} onClose={() => setRekap(null)} />
    </div>
  );
}
