import { useCallback, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Car, Gift, Info, Wallet } from 'lucide-react';
import { GradientStatRow } from '@/features/fleet/components/GradientStat';
import { MonthYearPicker } from '@/features/fleet/components/MonthYearPicker';
import { ViewModeToggle } from '@/features/fleet/components/ViewModeToggle';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { GrabMonitoringTable } from '@/features/grab/GrabMonitoringTable';
import { GrabCellModal } from '@/features/grab/GrabCellModal';
import { usePartnerGrabGridQuery, usePartnerGrabSummaryQuery } from '@/features/grab/hooks';
import { fleetSearchSchema, normalizeRange, type FleetSearch } from '@/features/fleet/searchSchema';
import { formatRangeNoteID, monthYearLabelID } from '@/lib/datetime';

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

  // Guard hand-edited URLs (half a pair, inverted, over-long) — treat as "Semua".
  const range = normalizeRange(search.dateFrom, search.dateTo);

  const grid = usePartnerGrabGridQuery({
    month: search.month,
    year: search.year,
    mode: search.mode,
  });
  // Cards come from the summary endpoint (the admin surface reads the same one),
  // so the range and whole-month figures can never be derived two different ways.
  const summary = usePartnerGrabSummaryQuery({
    month: search.month,
    year: search.year,
    ...range,
  });
  const stats = summary.data?.range ?? summary.data?.globalSummary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Fleet Monitoring — Grab</h2>
          <p className="text-sm text-muted-foreground">
            Earning untuk plat yang Anda daftarkan · {grid.data?.rows.length ?? '…'}{' '}
            {search.mode === 'driver' ? 'driver' : 'baris'}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <ViewModeToggle mode={search.mode} onChange={(mode) => setPeriod({ mode })} />
          <DateRangePicker
            value={range}
            onChange={(next) => setPeriod({ dateFrom: next?.dateFrom, dateTo: next?.dateTo })}
            month={search.month}
            year={search.year}
          />
          <MonthYearPicker
            month={search.month}
            year={search.year}
            onMonth={(m) => setPeriod({ month: m, dateFrom: undefined, dateTo: undefined })}
            onYear={(y) => setPeriod({ year: y, dateFrom: undefined, dateTo: undefined })}
          />
        </div>
      </div>

      {stats && (
        <div className={summary.isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <GradientStatRow
            cards={[
              {
                label: 'Total Pendapatan Terkumpul',
                value: stats.totalEarning,
                icon: Wallet,
                gradient: 'from-blue-500 to-sky-400',
                ...(summary.data?.range
                  ? {
                      note: formatRangeNoteID(
                        summary.data.range.fromDate,
                        summary.data.range.toDate,
                        summary.data.range.days,
                      ),
                    }
                  : {}),
              },
              {
                label: 'Total Tarif Driver',
                value: stats.totalDriverFare,
                icon: Car,
                gradient: 'from-emerald-500 to-green-400',
              },
              {
                label: 'Total Insentif',
                value: stats.totalIncentive,
                icon: Gift,
                gradient: 'from-orange-500 to-amber-400',
              },
            ]}
          />
        </div>
      )}

      {/* The range may reach outside the month, so say which period the daily
          table below covers rather than letting the two read as one. */}
      {range && (
        <p className="text-xs text-muted-foreground">
          Kartu mengikuti rentang tanggal · tabel harian di bawah tetap{' '}
          <span className="font-medium">{monthYearLabelID(search.month, search.year)}</span>.
        </p>
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
          <GrabMonitoringTable
            grid={grid.data}
            onDriverDetail={setDetailKey}
            readOnly
            mode={search.mode}
          />
        </div>
      )}

      {detailKey && (
        <GrabCellModal
          scope="partner"
          compositeKey={detailKey}
          month={search.month}
          year={search.year}
          mode={search.mode}
          onClose={() => setDetailKey(null)}
        />
      )}
    </div>
  );
}
