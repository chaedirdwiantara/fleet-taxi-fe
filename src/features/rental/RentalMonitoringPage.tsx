import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Info, Plus, Search, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { MONTH_NAMES_ID } from '@/lib/datetime';
import { CogsDefaultsDialog } from './components/CogsDefaultsDialog';
import { PaymentStatusDialog } from './components/PaymentStatusDialog';
import { RentalFilterBar } from './components/RentalFilterBar';
import { RentalFormDialog } from './components/RentalFormDialog';
import { RentalSummarySection } from './components/RentalSummarySection';
import { RentalTable } from './components/RentalTable';
import { downloadRentalExport, useDeleteRental, useRentalsQuery } from './hooks';
import type { RentalSearch } from './searchSchema';
import type { RentalItem, RentalListParams } from './types';

// Rental Monitoring — the partner's own rental transactions for a WIB month.
// Filter state lives in the URL (via the route's validateSearch); this page
// only receives it + a patch callback so it stays testable without a router.
export function RentalMonitoringPage({
  search,
  onPatch,
}: {
  search: RentalSearch;
  onPatch: (patch: Partial<RentalSearch>) => void;
}) {
  const params: RentalListParams = {
    month: search.month,
    year: search.year,
    region: search.region,
    search: search.search,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
  };
  const rentals = useRentalsQuery(params);
  const remove = useDeleteRental();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RentalItem | null>(null);
  const [paymentItem, setPaymentItem] = useState<RentalItem | null>(null);
  const [cogsOpen, setCogsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Debounced free-text search → URL param.
  const [searchText, setSearchText] = useState(search.search ?? '');
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchText.trim();
      if ((search.search ?? '') !== trimmed) onPatch({ search: trimmed || undefined });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, search.search, onPatch]);

  const doExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadRentalExport(params);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export gagal');
    } finally {
      setExporting(false);
    }
  };

  const regions = rentals.data?.regions ?? [];
  const fadeWhileFetching = rentals.isFetching ? 'opacity-70 transition-opacity' : '';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Rental Monitoring</h2>
        <p className="text-sm text-muted-foreground">
          Transaksi rental unit Anda per bulan — omset, COGS, dan nett profit dihitung otomatis.
        </p>
      </div>

      <RentalFilterBar search={search} regions={regions} onPatch={onPatch} />

      {rentals.isPending && <p className="text-sm text-muted-foreground">Memuat data rental…</p>}
      {rentals.isError && (
        <p className="text-sm text-destructive">Gagal memuat: {rentals.error.message}</p>
      )}

      {rentals.isSuccess && (
        <div className={`space-y-4 ${fadeWhileFetching}`}>
          <RentalSummarySection
            summary={rentals.data.summary}
            nettByType={rentals.data.nettByType}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden />
              Tambah Rental Data
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exporting}>
                  <Download aria-hidden />
                  {exporting ? 'Mengekspor…' : 'Export'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={doExport} disabled={exporting}>
                  <FileSpreadsheet aria-hidden />
                  Export Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => setCogsOpen(true)}>
              <Settings aria-hidden />
              Atur Default COGS
            </Button>
            <div className="relative w-full sm:ml-auto sm:w-72">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label="Cari rental"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Cari plat, customer, area…"
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
          </div>
          {exportError && (
            <p className="text-sm text-destructive" role="alert">
              {exportError}
            </p>
          )}

          <Card className="py-4">
            <CardHeader className="px-4 pb-0">
              <CardTitle className="text-sm">
                Daftar Rental — {MONTH_NAMES_ID[search.month - 1]} {search.year}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {rentals.data.items.length === 0 ? (
                <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>Belum ada data rental yang didaftarkan bulan ini.</span>
                </div>
              ) : (
                <RentalTable
                  items={rentals.data.items}
                  onEdit={setEditing}
                  onPaymentClick={setPaymentItem}
                  onDelete={(id) => remove.mutate(id)}
                  deletePending={remove.isPending}
                />
              )}
              {remove.isError && (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {remove.error.message}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <RentalFormDialog
        open={createOpen || editing != null}
        initial={editing}
        regions={regions}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
      />
      <PaymentStatusDialog item={paymentItem} onClose={() => setPaymentItem(null)} />
      <CogsDefaultsDialog open={cogsOpen} onClose={() => setCogsOpen(false)} />
    </div>
  );
}
