import { useCallback, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Car, Gift, Wallet } from 'lucide-react';
import { FilterBar } from '@/features/fleet/components/FilterBar';
import { TableFilterBar } from '@/features/fleet/components/TableFilterBar';
import { ImportPanel } from '@/features/fleet/components/ImportPanel';
import { ImportHistoryDialog } from '@/features/fleet/components/ImportHistoryDialog';
import { TargetEditor } from '@/features/fleet/components/TargetEditor';
import { GradientStatRow } from '@/features/fleet/components/GradientStat';
import { fleetSearchSchema, type FleetSearch } from '@/features/fleet/searchSchema';
import { GrabMonitoringTable } from '@/features/grab/GrabMonitoringTable';
import { GrabCellModal } from '@/features/grab/GrabCellModal';
import { useGrabGridQuery } from '@/features/grab/hooks';

export const Route = createFileRoute('/_admin/admin/fleet-monitoring-grab')({
  validateSearch: fleetSearchSchema,
  component: GrabGridPage,
});

function GrabGridPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [editPlate, setEditPlate] = useState<string | null>(null);

  const patchSearch = useCallback(
    (patch: Partial<FleetSearch>) =>
      navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true }),
    [navigate],
  );

  const grid = useGrabGridQuery({
    month: search.month,
    year: search.year,
    rentalPartner: search.rentalPartner,
    q: search.q,
    vehicleType: search.vehicleType,
    mode: search.mode,
  });

  // full unfiltered list from the payload (not post-filter rows), so selecting
  // one partner doesn't drop the others from the dropdown
  const partnerOptions = grid.data?.availableRentalPartners ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Fleet Monitoring — Grab</h2>
          <p className="text-sm text-muted-foreground">
            {search.mode === 'driver'
              ? 'Earning per driver (gabungan semua plat)'
              : 'Earning per kendaraan (plat · kota · driver)'}{' '}
            · {grid.data?.rows.length ?? '…'} baris
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportHistoryDialog platform="grab" />
          <ImportPanel platform="grab" />
        </div>
      </div>

      {grid.data && (
        <GradientStatRow
          cards={[
            {
              label: 'Total Pendapatan Terkumpul',
              value: grid.data.totals.earning,
              icon: Wallet,
              gradient: 'from-blue-500 to-sky-400',
            },
            {
              label: 'Total Tarif Driver',
              value: grid.data.totals.driverFare,
              icon: Car,
              gradient: 'from-emerald-500 to-green-400',
            },
            {
              label: 'Total Insentif',
              value: grid.data.totals.incentive,
              icon: Gift,
              gradient: 'from-orange-500 to-amber-400',
            },
          ]}
        />
      )}

      <FilterBar search={search} rentalPartnerOptions={partnerOptions} onChange={patchSearch} />

      {grid.isPending && <p className="text-sm text-muted-foreground">Memuat grid…</p>}
      {grid.isError && (
        <p className="text-sm text-destructive">Gagal memuat grid: {grid.error.message}</p>
      )}
      {/* Filters that narrow the table sit immediately above it. */}
      {grid.isSuccess && (
        <TableFilterBar
          mode={search.mode}
          q={search.q}
          vehicleType={search.vehicleType}
          typeOptions={grid.data.availableVehicleTypes ?? []}
          onChange={patchSearch}
          resultCount={grid.data.rows.length}
          resultNoun={search.mode === 'driver' ? 'driver' : 'baris'}
          // this surface's cards read grid.totals, so they DO follow the filter
        />
      )}
      {grid.isSuccess && (
        <div className={grid.isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <GrabMonitoringTable
            grid={grid.data}
            onDriverDetail={setDetailKey}
            onEditDriver={(row) => setEditPlate(row.plateNumber)}
            mode={search.mode}
          />
        </div>
      )}

      {detailKey && (
        <GrabCellModal
          compositeKey={detailKey}
          month={search.month}
          year={search.year}
          mode={search.mode}
          onClose={() => setDetailKey(null)}
        />
      )}
      {editPlate && (
        <TargetEditor platform="grab" plate={editPlate} onClose={() => setEditPlate(null)} />
      )}
    </div>
  );
}
