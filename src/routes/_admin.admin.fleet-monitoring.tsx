import { useCallback, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { CalendarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GojekMonitoringTable } from '@/features/fleet/components/GojekMonitoringTable';
import { FilterBar } from '@/features/fleet/components/FilterBar';
import { CellLegend } from '@/features/fleet/components/CellLegend';
import { CellModal } from '@/features/fleet/components/CellModal';
import { DriverHistoryModal } from '@/features/fleet/components/DriverHistoryModal';
import { ImportPanel } from '@/features/fleet/components/ImportPanel';
import { ImportHistoryDialog } from '@/features/fleet/components/ImportHistoryDialog';
import { ExceptionPanel } from '@/features/fleet/components/ExceptionPanel';
import { DriverEditor } from '@/features/fleet/components/DriverEditor';
import { useGojekGridQuery } from '@/features/fleet/hooks/useFleetQueries';
import {
  fleetSearchSchema,
  makeCellParam,
  parseCellParam,
  type FleetSearch,
} from '@/features/fleet/searchSchema';
import type { FleetRow } from '@/features/fleet/types';

export const Route = createFileRoute('/_admin/admin/fleet-monitoring')({
  validateSearch: fleetSearchSchema,
  component: GojekGridPage,
});

function GojekGridPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [editRow, setEditRow] = useState<FleetRow | null>(null);
  const [historyRow, setHistoryRow] = useState<FleetRow | null>(null);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionPlate, setExceptionPlate] = useState<string | undefined>(undefined);

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
    plate: search.plate,
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
            Rekonsiliasi setoran per kendaraan · hanya plat yang didaftarkan partner ·{' '}
            {grid.data?.rows.length ?? '…'} kendaraan
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

      <FilterBar search={search} rentalPartnerOptions={partnerOptions} onChange={patchSearch} />
      <CellLegend />

      {grid.isPending && <p className="text-sm text-muted-foreground">Memuat grid…</p>}
      {grid.isError && (
        <p className="text-sm text-destructive">Gagal memuat grid: {grid.error.message}</p>
      )}
      {grid.isSuccess && (
        <div className={grid.isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <GojekMonitoringTable
            grid={grid.data}
            onCellClick={openCell}
            onEditTarget={setEditRow}
            onManageException={openException}
            onDriverHistory={setHistoryRow}
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
          onClose={closeCell}
        />
      )}
      {historyRow && (
        <DriverHistoryModal row={historyRow} onClose={() => setHistoryRow(null)} />
      )}
      {editRow && (
        <DriverEditor
          platform="gojek"
          row={editRow}
          month={search.month}
          year={search.year}
          onClose={() => setEditRow(null)}
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
