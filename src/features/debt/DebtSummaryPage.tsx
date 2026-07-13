import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Info, Loader2, RefreshCw, Search, X } from 'lucide-react';
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
import { DebtFilterBar } from './components/DebtFilterBar';
import { DebtTable } from './components/DebtTable';
import { downloadDebtExport, useDebtFiltersQuery, useDebtSummaryQuery } from './hooks';
import type { DebtSearch } from './searchSchema';
import type { DebtListParams, DebtSortField } from './types';

const PAGE_SIZES = [10, 25, 50, 100];

export function DebtSummaryPage({
  search,
  onPatch,
}: {
  search: DebtSearch;
  onPatch: (patch: Partial<DebtSearch>) => void;
}) {
  const params: DebtListParams = {
    status: search.status,
    cabang: search.cabang,
    koordinator: search.koordinator,
    search: search.q,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    page: search.page,
    pageSize: search.pageSize,
  };

  const list = useDebtSummaryQuery(params);
  const filters = useDebtFiltersQuery();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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

  const toggleSort = (field: DebtSortField) =>
    onPatch(
      search.sortBy === field
        ? { sortOrder: search.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 }
        : { sortBy: field, sortOrder: 'asc', page: 1 },
    );

  const doExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadDebtExport(params);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export gagal');
    } finally {
      setExporting(false);
    }
  };

  const meta = list.data?.meta;
  const total = meta?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / search.pageSize));
  const from = total === 0 ? 0 : (search.page - 1) * search.pageSize + 1;
  const to = Math.min(search.page * search.pageSize, total);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Debt Summary</h2>
        <p className="text-sm text-muted-foreground">
          Posisi tagihan per driver, tersinkron langsung dari data Fleet Monitoring Gojek &amp;
          Grab.
        </p>
      </div>

      <DebtFilterBar search={search} options={filters.data} onPatch={onPatch} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">Entri per halaman:</span>
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
          <Button variant="outline" size="sm" onClick={doExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <FileSpreadsheet className="text-emerald-600" aria-hidden />
            )}
            Export
          </Button>
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
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cari driver / plat…"
              aria-label="Cari driver atau plat"
              className="h-8 w-full pl-8 pr-8 sm:w-56"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                aria-label="Hapus pencarian"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {exportError && (
        <p className="text-sm text-destructive" role="alert">
          {exportError}
        </p>
      )}

      <Card className="py-0">
        <CardContent className="px-0">
          {list.isPending && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Memuat data…</p>
          )}
          {list.isError && (
            <p className="px-4 py-8 text-center text-sm text-destructive">
              Gagal memuat: {list.error.message}
            </p>
          )}
          {list.isSuccess && list.data.data.length === 0 && (
            <div className="flex items-start gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                Belum ada data tagihan. Pastikan plat kendaraan Anda sudah terdaftar di{' '}
                <Link to="/partner/daftarkan-plat" className="font-medium text-primary underline">
                  Daftarkan Plat
                </Link>{' '}
                dan data Fleet Monitoring sudah terimport.
              </span>
            </div>
          )}
          {list.isSuccess && list.data.data.length > 0 && (
            <div className={list.isFetching ? 'opacity-70 transition-opacity' : undefined}>
              <DebtTable
                rows={list.data.data}
                sortBy={search.sortBy}
                sortOrder={search.sortOrder}
                onSort={toggleSort}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {list.isSuccess && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Menampilkan {from}–{to} dari {total} driver
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
    </div>
  );
}
