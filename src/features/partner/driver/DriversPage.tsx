import { useEffect, useState } from 'react';
import { Info, Search, X } from 'lucide-react';
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
import { DriverFormDialog } from './components/DriverFormDialog';
import { DriverTable } from './components/DriverTable';
import { useDriversQuery, useResignDriver } from './hooks';
import type { DriverSearch } from './searchSchema';
import type { DriverSummary } from './types';

const ALL = 'all';

// Daftar Driver — roster driver aktif (registrasi yang sudah disetujui).
export function DriversPage({
  search,
  onPatch,
  onOpenDetail,
}: {
  search: DriverSearch;
  onPatch: (patch: Partial<DriverSearch>) => void;
  onOpenDetail: (id: number) => void;
}) {
  const list = useDriversQuery({
    q: search.q,
    plate: search.plate,
    active: search.active,
    page: search.page,
  });
  const resign = useResignDriver();

  const [editing, setEditing] = useState<DriverSummary | null>(null);
  const [searchText, setSearchText] = useState(search.q ?? '');
  const [plateText, setPlateText] = useState(search.plate ?? '');

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = searchText.trim();
      const plate = plateText.trim();
      if ((search.q ?? '') !== q || (search.plate ?? '') !== plate) {
        onPatch({ q: q || undefined, plate: plate || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, plateText, search.q, search.plate, onPatch]);

  const total = list.data?.meta?.total ?? 0;
  const pageSize = list.data?.meta?.pageSize ?? 20;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const fadeWhileFetching = list.isFetching ? 'opacity-70 transition-opacity' : '';
  const hasFilter = !!search.q || !!search.plate || !!search.active;

  // A row-removing mutation can leave the URL pointing past the last page —
  // snap back once the shrunken result is confirmed (isFetching guards
  // placeholder data; lastPage < page guards re-patch loops).
  const rowCount = list.data?.rows.length;
  useEffect(() => {
    if (list.isSuccess && !list.isFetching && rowCount === 0 && search.page > 1 && lastPage < search.page) {
      onPatch({ page: Math.max(1, lastPage) });
    }
  }, [list.isSuccess, list.isFetching, rowCount, search.page, lastPage, onPatch]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Daftar Driver</h2>
        <p className="text-sm text-muted-foreground">
          Driver aktif Anda — kode driver diberikan saat registrasi disetujui.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Cari driver"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Cari nama / kode / email…"
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
        <Input
          aria-label="Filter plat"
          value={plateText}
          onChange={(e) => setPlateText(e.target.value)}
          placeholder="Filter plat…"
          className="w-full sm:w-44"
        />
        <Select
          value={search.active ?? ALL}
          onValueChange={(v) =>
            onPatch({ active: v === ALL ? undefined : (v as 'true' | 'false'), page: 1 })
          }
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter status aktif">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua status</SelectItem>
            <SelectItem value="true">Aktif</SelectItem>
            <SelectItem value="false">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
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
                    {hasFilter
                      ? 'Tidak ada driver yang cocok dengan pencarian/filter.'
                      : 'Belum ada driver aktif — setujui registrasi terlebih dahulu.'}
                  </span>
                </div>
              ) : (
                <DriverTable
                  items={list.data.rows}
                  onOpenDetail={onOpenDetail}
                  onEdit={setEditing}
                  onResign={(id) => resign.mutate(id)}
                  resignPending={resign.isPending}
                />
              )}
              {resign.isError && (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {resign.error.message}
                </p>
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

      <DriverFormDialog driver={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
