import { useCallback, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Info } from 'lucide-react';
import { GojekMonitoringTable } from '@/features/fleet/components/GojekMonitoringTable';
import { CellLegend } from '@/features/fleet/components/CellLegend';
import { CellModal } from '@/features/fleet/components/CellModal';
import { ExceptionPanel } from '@/features/fleet/components/ExceptionPanel';
import { SummaryCards } from '@/features/fleet/components/SummaryCards';
import { FleetChartsPanel } from '@/features/fleet/components/FleetChartsPanel';
import { MonthYearPicker } from '@/features/fleet/components/MonthYearPicker';
import {
  usePartnerGojekGridQuery,
  usePartnerGojekSummaryQuery,
} from '@/features/fleet/hooks/useFleetQueries';
import {
  fleetSearchSchema,
  makeCellParam,
  parseCellParam,
  type FleetSearch,
} from '@/features/fleet/searchSchema';

// Partner portal Gojek monitoring — read-only, scoped server-side to the
// partner's registered plates. Same components as the admin surface, minus the
// import / exception / target actions.
export const Route = createFileRoute('/_partner/partner/fleet-monitoring')({
  validateSearch: fleetSearchSchema,
  component: PartnerGojekPage,
});

function PartnerGojekPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionPlate, setExceptionPlate] = useState<string | undefined>(undefined);

  const openException = (plate?: string) => {
    setExceptionPlate(plate);
    setExceptionOpen(true);
  };

  const setPeriod = useCallback(
    (patch: Partial<FleetSearch>) => {
      navigate({ search: (prev) => ({ ...prev, cell: undefined, ...patch }), replace: true });
    },
    [navigate],
  );

  const grid = usePartnerGojekGridQuery({ month: search.month, year: search.year });
  const summary = usePartnerGojekSummaryQuery({ month: search.month, year: search.year });

  const openCell = useCallback(
    (plateNorm: string, d: number) =>
      navigate({ search: (prev) => ({ ...prev, cell: makeCellParam(plateNorm, d) }) }),
    [navigate],
  );
  const closeCell = useCallback(
    () => navigate({ search: (prev) => ({ ...prev, cell: undefined }), replace: true }),
    [navigate],
  );
  const cell = parseCellParam(search.cell);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Fleet Monitoring — Gojek</h2>
          <p className="text-sm text-muted-foreground">
            Setoran untuk plat yang Anda daftarkan · {grid.data?.rows.length ?? '…'} kendaraan
          </p>
        </div>
        <MonthYearPicker
          month={search.month}
          year={search.year}
          onMonth={(m) => setPeriod({ month: m })}
          onYear={(y) => setPeriod({ year: y })}
        />
      </div>

      {summary.isError && (
        <p className="text-sm text-destructive">Gagal memuat ringkasan: {summary.error.message}</p>
      )}
      {summary.isSuccess && (
        <div className={summary.isFetching ? 'space-y-4 opacity-70 transition-opacity' : 'space-y-4'}>
          <SummaryCards summary={summary.data.globalSummary} />
          {/* No per-partner split here — a partner only ever sees itself. */}
          <FleetChartsPanel charts={summary.data.charts} showPartnerSplit={false} />
        </div>
      )}

      <CellLegend />

      {grid.isPending && <p className="text-sm text-muted-foreground">Memuat grid…</p>}
      {grid.isError && (
        <p className="text-sm text-destructive">Gagal memuat grid: {grid.error.message}</p>
      )}
      {grid.isSuccess && grid.data.rows.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Belum ada data setoran untuk periode ini. Pastikan plat kendaraan Anda sudah terdaftar
            di{' '}
            <Link to="/partner/daftarkan-plat" className="font-medium text-primary underline">
              Daftarkan Plat
            </Link>
            .
          </span>
        </div>
      )}
      {grid.isSuccess && grid.data.rows.length > 0 && (
        <div className={grid.isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <GojekMonitoringTable
            grid={grid.data}
            onCellClick={openCell}
            onManageException={openException}
            readOnly
          />
        </div>
      )}

      {cell && (
        <CellModal
          scope="partner"
          plate={cell.key}
          day={cell.day}
          month={search.month}
          year={search.year}
          onClose={closeCell}
        />
      )}
      <ExceptionPanel
        scope="partner"
        month={search.month}
        year={search.year}
        open={exceptionOpen}
        onOpenChange={setExceptionOpen}
        defaultPlate={exceptionPlate}
      />
    </div>
  );
}
