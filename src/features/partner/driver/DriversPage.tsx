import { useEffect, useState } from 'react';
import { Info, RefreshCw, Search, X } from 'lucide-react';
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
import { DriverTable } from './components/DriverTable';
import { useDriversQuery } from './hooks';
import type { DriverSearch } from './searchSchema';

const ALL = 'all';

// Daftar Driver — the whole roster (including resigned drivers), auto-synced
// server-side from Fleet Monitoring on every list load. No create affordance:
// rows appear via the sync (or BE-manual entry); the FE only completes data.
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
    resigned: search.resigned,
    page: search.page,
  });

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
  const hasFilter = !!search.q || !!search.plate || !!search.active || !!search.resigned;

  // A shrinking result set can leave the URL pointing past the last page —
  // snap back once the shrunken result is confirmed (isFetching guards
  // placeholder data; lastPage < page guards re-patch loops).
  const rowCount = list.data?.rows.length;
  useEffect(() => {
    if (
      list.isSuccess &&
      !list.isFetching &&
      rowCount === 0 &&
      search.page > 1 &&
      lastPage < search.page
    ) {
      onPatch({ page: Math.max(1, lastPage) });
    }
  }, [list.isSuccess, list.isFetching, rowCount, search.page, lastPage, onPatch]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Daftar Driver</h2>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <RefreshCw className="size-3.5 shrink-0" aria-hidden />
          Data driver tersinkron otomatis dari Fleet Monitoring (Gojek &amp; Grab).
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Cari driver"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Cari nama / kode / email…"
            className="pr-8 pl-8"
          />
          {searchText !== '' && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
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
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter status aktif">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua status</SelectItem>
            <SelectItem value="true">Aktif</SelectItem>
            <SelectItem value="false">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={search.resigned ?? ALL}
          onValueChange={(v) =>
            onPatch({ resigned: v === ALL ? undefined : (v as 'true' | 'false'), page: 1 })
          }
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter resign">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua driver</SelectItem>
            <SelectItem value="true">Resign</SelectItem>
            <SelectItem value="false">Belum resign</SelectItem>
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
                      : 'Belum ada driver — data akan muncul otomatis setelah sinkronisasi Fleet Monitoring.'}
                  </span>
                </div>
              ) : (
                <DriverTable items={list.data.rows} onOpenDetail={onOpenDetail} />
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
