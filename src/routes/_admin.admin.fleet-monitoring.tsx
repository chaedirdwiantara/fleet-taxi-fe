import { useCallback, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { CalendarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GojekMonitoringTable } from '@/features/fleet/components/GojekMonitoringTable';
import { FilterBar } from '@/features/fleet/components/FilterBar';
import { TableFilterBar } from '@/features/fleet/components/TableFilterBar';
import { CellLegend } from '@/features/fleet/components/CellLegend';
import { CellModal } from '@/features/fleet/components/CellModal';
import { ImportPanel } from '@/features/fleet/components/ImportPanel';
import { ImportHistoryDialog } from '@/features/fleet/components/ImportHistoryDialog';
import { ExceptionPanel } from '@/features/fleet/components/ExceptionPanel';
import { ManualPaymentEditor } from '@/features/fleet/components/ManualPaymentEditor';
import { RawDataPanel } from '@/features/fleet/components/RawDataPanel';
import { ViewModeToggle } from '@/features/fleet/components/ViewModeToggle';
import { useGojekGridQuery } from '@/features/fleet/hooks/useFleetQueries';
import {
  fleetSearchSchema,
  makeCellParam,
  parseCellParam,
  type FleetSearch,
} from '@/features/fleet/searchSchema';

export const Route = createFileRoute('/_admin/admin/fleet-monitoring')({
  validateSearch: fleetSearchSchema,
  component: GojekGridPage,
});

function GojekGridPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionPlate, setExceptionPlate] = useState<string | undefined>(undefined);
  // Proses/Edit Manual Payment: dari queue "Data Mentah Tanpa Plat" maupun
  // tombol Edit pada item manual di modal Detail Transaksi.
  const [editingDetailId, setEditingDetailId] = useState<number | null>(null);

  const patchSearch = useCallback(
    (patch: Partial<FleetSearch>) => {
      // period/filter changes close any open cell modal (its plate/day no
      // longer belongs to the new period) unless the patch sets it explicitly
      const clearCell = !('cell' in patch);
      navigate({
        search: (prev) => ({ ...prev, ...(clearCell ? { cell: undefined } : {}), ...patch }),
        replace: true,
      });
    },
    [navigate],
  );

  const grid = useGojekGridQuery({
    month: search.month,
    year: search.year,
    rentalPartner: search.rentalPartner,
    q: search.q,
    vehicleType: search.vehicleType,
    mode: search.mode,
  });

  const openCell = useCallback(
    (plateNorm: string, day: number) =>
      navigate({ search: (prev) => ({ ...prev, cell: makeCellParam(plateNorm, day) }) }),
    [navigate],
  );
  const closeCell = useCallback(
    // replace (not push): closing shouldn't leave a history entry that Back
    // would re-open. openCell still pushes, so Back closes an open modal.
    () => navigate({ search: (prev) => ({ ...prev, cell: undefined }), replace: true }),
    [navigate],
  );

  const openException = (plate?: string) => {
    setExceptionPlate(plate);
    setExceptionOpen(true);
  };

  const partnerOptions = useMemo(
    () => grid.data?.availableRentalPartners ?? [],
    [grid.data?.availableRentalPartners],
  );
  const cell = parseCellParam(search.cell);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Fleet Monitoring — Gojek</h2>
          <p className="text-sm text-muted-foreground">
            Rekonsiliasi setoran per {search.mode === 'driver' ? 'driver' : 'kendaraan'} · hanya
            plat yang didaftarkan partner · {grid.data?.rows.length ?? '…'}{' '}
            {search.mode === 'driver' ? 'driver' : 'kendaraan'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => openException()}>
            <CalendarOff aria-hidden /> Exceptions
          </Button>
          <ImportHistoryDialog platform="gojek" />
          <ImportPanel platform="gojek" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ViewModeToggle mode={search.mode} onChange={(mode) => patchSearch({ mode })} />
        <FilterBar search={search} rentalPartnerOptions={partnerOptions} onChange={patchSearch} />
      </div>
      <CellLegend mode={search.mode} />

      {grid.isPending && <p className="text-sm text-muted-foreground">Memuat grid…</p>}
      {grid.isError && (
        <p className="text-sm text-destructive">Gagal memuat grid: {grid.error.message}</p>
      )}
      {grid.isSuccess && (
        <RawDataPanel
          rows={grid.data.rawRows ?? []}
          totalAmount={grid.data.rawTotalAmount ?? 0}
          onProcess={setEditingDetailId}
        />
      )}
      {/* Filters that narrow the table sit immediately above it. */}
      {grid.isSuccess && (
        <TableFilterBar
          q={search.q}
          vehicleType={search.vehicleType}
          typeOptions={grid.data.availableVehicleTypes ?? []}
          onChange={patchSearch}
          resultCount={grid.data.rows.length}
          resultNoun={search.mode === 'driver' ? 'driver' : 'kendaraan'}
        />
      )}
      {grid.isSuccess && (
        <div className={grid.isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <GojekMonitoringTable
            grid={grid.data}
            onCellClick={openCell}
            mode={search.mode}
            emptyMessage="Tidak ada data untuk periode / filter ini — tabel hanya menampilkan plat yang didaftarkan partner melalui menu Daftarkan Plat."
          />
        </div>
      )}

      {cell && (
        <CellModal
          plate={cell.key}
          day={cell.day}
          month={search.month}
          year={search.year}
          mode={search.mode}
          onClose={closeCell}
          onEditDetail={setEditingDetailId}
        />
      )}
      {editingDetailId !== null && (
        <ManualPaymentEditor
          detailId={editingDetailId}
          month={search.month}
          year={search.year}
          onClose={() => setEditingDetailId(null)}
        />
      )}
      <ExceptionPanel
        month={search.month}
        year={search.year}
        open={exceptionOpen}
        onOpenChange={setExceptionOpen}
        defaultPlate={exceptionPlate}
      />
    </div>
  );
}
