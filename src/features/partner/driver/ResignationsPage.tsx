import { useEffect, useState } from 'react';
import { Info, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ResignTable } from './components/ResignTable';
import { useResignationsQuery } from './hooks';
import type { ResignationSearch } from './searchSchema';

// Driver Resign — mantan driver; dari sini pengembalian deposit dikelola.
export function ResignationsPage({
  search,
  onPatch,
  onOpenDetail,
}: {
  search: ResignationSearch;
  onPatch: (patch: Partial<ResignationSearch>) => void;
  onOpenDetail: (id: number) => void;
}) {
  const list = useResignationsQuery({ q: search.q, page: search.page });

  const [searchText, setSearchText] = useState(search.q ?? '');
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchText.trim();
      if ((search.q ?? '') !== trimmed) onPatch({ q: trimmed || undefined, page: 1 });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, search.q, onPatch]);

  const total = list.data?.meta?.total ?? 0;
  const pageSize = list.data?.meta?.pageSize ?? 20;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const fadeWhileFetching = list.isFetching ? 'opacity-70 transition-opacity' : '';

  // A row-removing mutation (none today, but list contents shift as drivers
  // resign) can leave the URL pointing past the last page — snap back once
  // the shrunken result is confirmed.
  const rowCount = list.data?.rows.length;
  useEffect(() => {
    if (list.isSuccess && !list.isFetching && rowCount === 0 && search.page > 1 && lastPage < search.page) {
      onPatch({ page: Math.max(1, lastPage) });
    }
  }, [list.isSuccess, list.isFetching, rowCount, search.page, lastPage, onPatch]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Driver Resign</h2>
        <p className="text-sm text-muted-foreground">
          Driver yang sudah resign — kelola pengembalian deposit dari sini.
        </p>
      </div>

      <div className="relative w-full sm:w-80">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          aria-label="Cari driver resign"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Cari nama / kode driver…"
          className="pl-8 pr-8"
        />
        {searchText !== '' && (
          <button
            type="button"
            aria-label="Hapus pencarian"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchText('')}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {list.isPending && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {list.isError && (
        <p className="text-sm text-destructive">Gagal memuat: {list.error.message}</p>
      )}

      {list.isSuccess && (
        <div className={`space-y-4 ${fadeWhileFetching}`}>
          <Card className="py-4">
            <CardContent className="px-4">
              {list.data.rows.length === 0 ? (
                <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    {search.q
                      ? 'Tidak ada driver resign yang cocok dengan pencarian.'
                      : 'Belum ada driver yang resign.'}
                  </span>
                </div>
              ) : (
                <ResignTable items={list.data.rows} onOpenDetail={onOpenDetail} />
              )}
            </CardContent>
          </Card>

          {lastPage > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={search.page <= 1}
                onClick={() => onPatch({ page: search.page - 1 })}
              >
                Sebelumnya
              </Button>
              <span className="text-xs text-muted-foreground">
                Halaman {search.page} dari {lastPage}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={search.page >= lastPage}
                onClick={() => onPatch({ page: search.page + 1 })}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
