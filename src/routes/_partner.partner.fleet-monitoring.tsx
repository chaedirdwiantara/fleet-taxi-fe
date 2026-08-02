import { useCallback, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Info, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { GojekMonitoringTable } from '@/features/fleet/components/GojekMonitoringTable';
import { TableFilterBar } from '@/features/fleet/components/TableFilterBar';
import { CellLegend } from '@/features/fleet/components/CellLegend';
import { CellModal } from '@/features/fleet/components/CellModal';
import { ExceptionPanel } from '@/features/fleet/components/ExceptionPanel';
import { SummaryCards } from '@/features/fleet/components/SummaryCards';
import { FleetChartsPanel } from '@/features/fleet/components/FleetChartsPanel';
import { MonthYearPicker } from '@/features/fleet/components/MonthYearPicker';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { monthYearLabelID } from '@/lib/datetime';
import {
  usePartnerGojekGridQuery,
  usePartnerGojekSummaryQuery,
} from '@/features/fleet/hooks/useFleetQueries';
import {
  fleetSearchSchema,
  makeCellParam,
  normalizeRange,
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

  const patchSearch = useCallback(
    (patch: Partial<FleetSearch>) => {
      navigate({ search: (prev) => ({ ...prev, cell: undefined, ...patch }), replace: true });
    },
    [navigate],
  );

  // Guard hand-edited URLs (half a pair, inverted, over-long) — treat as "Semua".
  const range = normalizeRange(search.dateFrom, search.dateTo);

  const grid = usePartnerGojekGridQuery({
    month: search.month,
    year: search.year,
    mode: search.mode,
    q: search.q,
    vehicleType: search.vehicleType,
  });
  const isFiltered = Boolean(search.q) || search.vehicleType.length > 0;
  // Cards & charts stay plate-based: they describe the fleet, not individuals.
  const summary = usePartnerGojekSummaryQuery({
    month: search.month,
    year: search.year,
    ...range,
  });

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
            Setoran untuk plat yang Anda daftarkan · {grid.data?.rows.length ?? '…'}{' '}
            {search.mode === 'driver' ? 'driver' : 'kendaraan'}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <DateRangePicker
            value={range}
            onChange={(next) => patchSearch({ dateFrom: next?.dateFrom, dateTo: next?.dateTo })}
            month={search.month}
            year={search.year}
          />
          <MonthYearPicker
            month={search.month}
            year={search.year}
            onMonth={(m) => patchSearch({ month: m, dateFrom: undefined, dateTo: undefined })}
            onYear={(y) => patchSearch({ year: y, dateFrom: undefined, dateTo: undefined })}
          />
        </div>
      </div>

      {summary.isError && (
        <p className="text-sm text-destructive">Gagal memuat ringkasan: {summary.error.message}</p>
      )}
      {summary.isSuccess && (
        <div
          className={summary.isFetching ? 'space-y-4 opacity-70 transition-opacity' : 'space-y-4'}
        >
          <SummaryCards
            summary={summary.data.globalSummary}
            range={summary.data.range}
            exitedDrivers={summary.data.exitedDrivers}
            lastImportDate={summary.data.lastImportDate}
          />
          {/* No per-partner split here — a partner only ever sees itself. */}
          <FleetChartsPanel
            charts={summary.data.charts}
            showPartnerSplit={false}
            range={summary.data.range}
          />
        </div>
      )}

      {/* The range may reach outside the month, so say which period the daily
          table below covers rather than letting the two read as one. */}
      {range && (
        <p className="text-xs text-muted-foreground">
          Ringkasan mengikuti rentang tanggal · tabel harian di bawah tetap{' '}
          <span className="font-medium">{monthYearLabelID(search.month, search.year)}</span>.
        </p>
      )}

      {grid.isPending && <p className="text-sm text-muted-foreground">Memuat grid…</p>}
      {grid.isError && (
        <p className="text-sm text-destructive">Gagal memuat grid: {grid.error.message}</p>
      )}
      {/* Everything that shapes the table sits directly above it — the mode
          toggle included, since it decides what a row is. Their effect shows
          immediately below, without scrolling back past the cards and chart. */}
      {grid.isSuccess && (
        <TableFilterBar
          mode={search.mode}
          q={search.q}
          vehicleType={search.vehicleType}
          typeOptions={grid.data.availableVehicleTypes ?? []}
          onChange={patchSearch}
          resultCount={grid.data.rows.length}
          resultNoun={search.mode === 'driver' ? 'driver' : 'kendaraan'}
          hasUnfilteredAggregates
        />
      )}
      {/* after the controls: its wording depends on the mode chosen above */}
      <CellLegend mode={search.mode} />
      {/* An active filter with no match must not read as "no data this month" —
          it needs a way back, not an invitation to register plates. */}
      {grid.isSuccess && grid.data.rows.length === 0 && isFiltered && (
        <EmptyState
          icon={SearchX}
          title="Tidak ada baris yang cocok"
          description="Tidak ada plat atau driver yang cocok dengan pencarian dan tipe kendaraan yang dipilih pada periode ini."
          action={
            <Button
              variant="outline"
              onClick={() => patchSearch({ q: undefined, vehicleType: [] })}
            >
              Bersihkan filter
            </Button>
          }
        />
      )}
      {grid.isSuccess && grid.data.rows.length === 0 && !isFiltered && (
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
            mode={search.mode}
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
          mode={search.mode}
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
