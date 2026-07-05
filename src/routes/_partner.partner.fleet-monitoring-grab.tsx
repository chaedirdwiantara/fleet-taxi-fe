import { useCallback, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Car, Gift, Info, Wallet } from 'lucide-react';
import { GradientStatRow } from '@/features/fleet/components/GradientStat';
import { MonthYearPicker } from '@/features/fleet/components/MonthYearPicker';
import { GrabMonitoringTable } from '@/features/grab/GrabMonitoringTable';
import { GrabCellModal } from '@/features/grab/GrabCellModal';
import { usePartnerGrabGridQuery } from '@/features/grab/hooks';
import { fleetSearchSchema, type FleetSearch } from '@/features/fleet/searchSchema';

// Partner portal Grab monitoring — read-only, scoped to registered plates.
export const Route = createFileRoute('/_partner/partner/fleet-monitoring-grab')({
  validateSearch: fleetSearchSchema,
  component: PartnerGrabPage,
});

function PartnerGrabPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const setPeriod = useCallback(
    (patch: Partial<FleetSearch>) => {
      setDetailKey(null); // close a stale detail modal when the period changes
      navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
    },
    [navigate],
  );

  const grid = usePartnerGrabGridQuery({ month: search.month, year: search.year });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Fleet Monitoring — Grab</h2>
          <p className="text-sm text-muted-foreground">
            Earning untuk plat yang Anda daftarkan · {grid.data?.rows.length ?? '…'} baris
          </p>
        </div>
        <MonthYearPicker
          month={search.month}
          year={search.year}
          onMonth={(m) => setPeriod({ month: m })}
          onYear={(y) => setPeriod({ year: y })}
        />
      </div>

      {grid.data && grid.data.rows.length > 0 && (
        <div className={grid.isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <GradientStatRow
            cards={[
              { label: 'Total Pendapatan Terkumpul', value: grid.data.totals.earning, icon: Wallet, gradient: 'from-blue-500 to-sky-400' },
              { label: 'Total Tarif Driver', value: grid.data.totals.driverFare, icon: Car, gradient: 'from-emerald-500 to-green-400' },
              { label: 'Total Insentif', value: grid.data.totals.incentive, icon: Gift, gradient: 'from-orange-500 to-amber-400' },
            ]}
          />
        </div>
      )}

      {grid.isPending && <p className="text-sm text-muted-foreground">Memuat grid…</p>}
      {grid.isError && (
        <p className="text-sm text-destructive">Gagal memuat grid: {grid.error.message}</p>
      )}
      {grid.isSuccess && grid.data.rows.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Belum ada data Grab untuk periode ini. Pastikan plat kendaraan Anda sudah terdaftar di{' '}
            <Link to="/partner/daftarkan-plat" className="font-medium text-primary underline">
              Daftarkan Plat
            </Link>
            .
          </span>
        </div>
      )}
      {grid.isSuccess && grid.data.rows.length > 0 && (
        <div className={grid.isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <GrabMonitoringTable grid={grid.data} onDriverDetail={setDetailKey} readOnly />
        </div>
      )}

      {detailKey && (
        <GrabCellModal
          scope="partner"
          compositeKey={detailKey}
          month={search.month}
          year={search.year}
          onClose={() => setDetailKey(null)}
        />
      )}
    </div>
  );
}
