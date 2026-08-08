import { Link } from '@tanstack/react-router';
import { CarFront, Coins, LayoutGrid, Table2, Wallet } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { GradientStatRow } from '@/features/fleet/components/GradientStat';
import { MonthYearPicker } from '@/features/fleet/components/MonthYearPicker';
import { ViewModeToggle } from '@/features/fleet/components/ViewModeToggle';
import { makeCellParam, parseCellParam, type FleetSearch } from '@/features/fleet/searchSchema';
import { rentalSearchSchema } from '@/features/rental/searchSchema';
import { formatNumberID } from '@/lib/money';
import { AllFleetCellModal } from './components/AllFleetCellModal';
import { AllFleetLegend } from './components/AllFleetLegend';
import { AllFleetTable } from './components/AllFleetTable';
import { usePartnerAllFleetGridQuery } from './hooks';

// All Fleet Monitoring — the partner's whole fleet income in one matrix: Gojek
// setoran + Grab earning + Rental omset, per subject per day. Read-only, scoped
// server-side; the per-platform screens remain the drill-downs.
//
// Period, mode and the open cell all live in the URL (the route owns it); this
// page only receives that state plus a patch callback, so it stays testable
// without a router — same split as RentalMonitoringPage.
export function AllFleetMonitoringPage({
  search,
  onPatch,
}: {
  search: FleetSearch;
  onPatch: (patch: Partial<FleetSearch>) => void;
}) {
  const grid = usePartnerAllFleetGridQuery({
    month: search.month,
    year: search.year,
    mode: search.mode,
  });

  // A period or mode change invalidates any open cell — its subject/day no
  // longer belongs to what is on screen.
  const setPeriod = (patch: Partial<FleetSearch>) => onPatch({ cell: undefined, ...patch });
  const cell = parseCellParam(search.cell);

  const subjectWord = search.mode === 'driver' ? 'driver' : 'plat';
  const totals = grid.data?.totals;
  const isEmpty = grid.isSuccess && grid.data.rows.length === 0 && grid.data.residual === null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">All Fleet Monitoring</h2>
          <p className="text-sm text-muted-foreground">
            Pemasukan tiap {subjectWord} per tanggal dari Gojek · Grab · Rental
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ViewModeToggle mode={search.mode} onChange={(mode) => setPeriod({ mode })} />
          <MonthYearPicker
            month={search.month}
            year={search.year}
            onMonth={(m) => setPeriod({ month: m })}
            onYear={(y) => setPeriod({ year: y })}
          />
        </div>
      </div>

      {grid.isSuccess && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {formatNumberID(grid.data.subjectCount)} {subjectWord}
          </Badge>
          <Badge variant="secondary">{formatNumberID(grid.data.activeCount)} bertransaksi</Badge>
        </div>
      )}

      {totals && (
        <div className={grid.isFetching ? 'opacity-70 transition-opacity' : undefined}>
          <GradientStatRow
            cards={[
              {
                label: 'Total Pemasukan',
                value: totals.total,
                icon: LayoutGrid,
                gradient: 'from-indigo-500 to-violet-400',
              },
              {
                label: 'Gojek (Setoran)',
                value: totals.gojek,
                icon: Wallet,
                gradient: 'from-emerald-500 to-green-400',
              },
              {
                label: 'Grab (Earning)',
                value: totals.grab,
                icon: CarFront,
                gradient: 'from-orange-500 to-amber-400',
              },
              {
                label: 'Rental (Omset)',
                value: totals.rental,
                icon: Coins,
                gradient: 'from-blue-500 to-sky-400',
              },
            ]}
          />
        </div>
      )}

      <AllFleetLegend mode={search.mode} />

      {grid.isPending && <p className="text-sm text-muted-foreground">Memuat matriks…</p>}
      {grid.isError && (
        <p className="text-sm text-destructive">Gagal memuat matriks: {grid.error.message}</p>
      )}
      {isEmpty && (
        <EmptyState
          icon={Table2}
          title="Belum ada pemasukan pada periode ini"
          description="Data muncul otomatis setelah admin mengimpor Gojek/Grab untuk plat yang Anda daftarkan, atau setelah Anda mencatat transaksi di Rental Management."
          action={
            <Link
              to="/partner/rental/management"
              // The target owns required filter params; the schema's own defaults
              // are the honest "no filters" value.
              search={rentalSearchSchema.parse({ month: search.month, year: search.year })}
              className="font-medium text-primary underline underline-offset-2"
            >
              Buka Rental Monitoring
            </Link>
          }
        />
      )}
      {grid.isSuccess && !isEmpty && (
        <div className={grid.isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <AllFleetTable
            grid={grid.data}
            onCellClick={(key, day) => onPatch({ cell: makeCellParam(key, day) })}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Warna <b>latar</b> sel menunjukkan sumber pemasukan hari itu; warna <b>angkanya</b>{' '}
        menunjukkan status setoran Gojek pada hari itu, memakai legenda yang sama persis dengan
        halaman Gojek. Basis nominalnya juga sama dengan tiap halaman sumbernya — Gojek memakai
        setoran yang dihitung, Grab memakai total earning collected, dan Rental memakai omset (harga
        sewa + biaya tambahan). Karena itu Manual Payment yang <i>tidak masuk setoran</i> tampil{' '}
        <b>0</b> berwarna ungu: nominalnya ada, tapi memang tidak dihitung ke setoran — angka
        persisnya ada di rincian sel. Baris <b>TOTAL</b> selalu sama untuk kedua mode.
      </p>

      {cell && (
        <AllFleetCellModal
          cellKey={cell.key}
          day={cell.day}
          month={search.month}
          year={search.year}
          mode={search.mode}
          onClose={() => onPatch({ cell: undefined })}
        />
      )}
    </div>
  );
}
