import { useEffect, useState } from 'react';
import { RefreshCw, Search, UserMinus, X } from 'lucide-react';
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
import { EmptyState } from '@/components/shared/EmptyState';
import { ResignedDriverTable } from './components/ResignedDriverTable';
import { useDriversQuery } from './hooks';
import type { ResignedDriverSearch } from './searchSchema';
import { RESIGNED_TYPE_LABELS, type ResignedType } from './types';

const ALL = 'all';

// Driver Resign — everyone who has left the fleet, from two sources that stay
// in one list: drivers the partner marked resign on the edit page (manual), and
// drivers the Gojek/Grab import stopped carrying (auto, mirrors the "Keluar"
// tag in the monitoring grid). The auto half is recomputed on every load, so a
// driver who shows up in a later import drops off this list by itself.
export function ResignedDriversPage({
  search,
  onPatch,
  onOpenDetail,
}: {
  search: ResignedDriverSearch;
  onPatch: (patch: Partial<ResignedDriverSearch>) => void;
  onOpenDetail: (id: number) => void;
}) {
  const list = useDriversQuery({
    q: search.q,
    plate: search.plate,
    resigned: 'true',
    resignedType: search.resignedType,
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
  const hasFilter = !!search.q || !!search.plate || !!search.resignedType;

  // A shrinking result set can leave the URL pointing past the last page —
  // snap back once the shrunken result is confirmed (same guard as the roster).
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
        <h2 className="text-lg font-semibold">Driver Resign</h2>
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <RefreshCw className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Berisi driver yang ditandai resign lewat Daftar Driver dan yang terdeteksi keluar dari
            data import Gojek/Grab. Driver yang muncul lagi di import terbaru otomatis keluar dari
            daftar ini.
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Cari driver resign"
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
          value={search.resignedType ?? ALL}
          onValueChange={(v) =>
            onPatch({ resignedType: v === ALL ? undefined : (v as ResignedType), page: 1 })
          }
        >
          <SelectTrigger className="w-full sm:w-52" aria-label="Filter tipe resign">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua tipe</SelectItem>
            <SelectItem value="manual">{RESIGNED_TYPE_LABELS.manual}</SelectItem>
            <SelectItem value="auto">{RESIGNED_TYPE_LABELS.auto}</SelectItem>
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
                <EmptyState
                  icon={UserMinus}
                  title={
                    hasFilter
                      ? 'Tidak ada driver resign yang cocok'
                      : 'Belum ada driver yang resign'
                  }
                  description={
                    hasFilter
                      ? 'Ubah kata kunci, plat, atau tipe resign untuk melihat hasil lain.'
                      : 'Driver akan muncul di sini setelah ditandai resign atau saat tidak lagi terbaca di data import.'
                  }
                />
              ) : (
                <ResignedDriverTable items={list.data.rows} onOpenDetail={onOpenDetail} />
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
