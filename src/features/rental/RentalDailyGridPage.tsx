import { Link } from '@tanstack/react-router';
import { CalendarRange, Coins, MousePointerClick, TrendingUp, Wallet } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GradientStatRow } from '@/features/fleet/components/GradientStat';
import { MonthYearPicker } from '@/features/fleet/components/MonthYearPicker';
import { makeCellParam, parseCellParam } from '@/features/fleet/searchSchema';
import { formatNumberID } from '@/lib/money';
import { RentalDailyGrid } from './components/RentalDailyGrid';
import { RentalDayCellModal } from './components/RentalDayCellModal';
import { useRentalGridQuery } from './hooks';
import { formatUtilization, LEGEND, toneSwatch } from './lib/rentalDayTone';
import { rentalSearchSchema } from './searchSchema';
import type { RentalGridSearch } from './gridSearchSchema';

// Rental Monitoring — the partner's rental month read as a calendar: which plate
// earned on which day, and whether that money has been collected. The ledger
// behind it lives in Rental Management; this screen never writes.
//
// Period and the open cell live in the URL (the route owns it); this page only
// receives that state plus a patch callback, so it stays testable without a
// router — same split as AllFleetMonitoringPage.
export function RentalDailyGridPage({
  search,
  onPatch,
}: {
  search: RentalGridSearch;
  onPatch: (patch: Partial<RentalGridSearch>) => void;
}) {
  const grid = useRentalGridQuery({ month: search.month, year: search.year });

  // A period change invalidates any open cell — its plate/day no longer belongs
  // to what is on screen.
  const setPeriod = (patch: Partial<RentalGridSearch>) => onPatch({ cell: undefined, ...patch });
  const openCell = parseCellParam(search.cell);
  const openRow = openCell ? grid.data?.rows.find((r) => r.plateNorm === openCell.key) : undefined;

  const totals = grid.data?.totals;
  const isEmpty = grid.isSuccess && grid.data.rows.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Rental Monitoring</h2>
          <p className="text-sm text-muted-foreground">
            Omset sewa tiap plat per tanggal, beserta status pembayarannya
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
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
          <Badge variant="secondary">{formatNumberID(grid.data.plateCount)} plat</Badge>
          <Badge variant="secondary">{formatNumberID(grid.data.activeCount)} tersewa</Badge>
          <Badge variant="secondary">
            Utilisasi armada{' '}
            {formatUtilization(
              grid.data.totals.rentedDays,
              grid.data.daysInMonth * grid.data.plateCount,
            )}
          </Badge>
        </div>
      )}

      {totals && grid.data && (
        <div className={grid.isFetching ? 'opacity-70 transition-opacity' : undefined}>
          <GradientStatRow
            cards={[
              {
                label: 'Total Omset',
                value: totals.omset,
                icon: Coins,
                gradient: 'from-blue-500 to-sky-400',
              },
              {
                label: 'Total COGS',
                value: totals.cogs,
                icon: Wallet,
                gradient: 'from-slate-500 to-slate-400',
              },
              {
                label: 'Nett Profit',
                value: totals.nett,
                icon: TrendingUp,
                gradient: 'from-emerald-500 to-green-400',
              },
              {
                label: 'Hari Tersewa',
                value: totals.rentedDays,
                icon: CalendarRange,
                gradient: 'from-indigo-500 to-violet-400',
                // a day count, not money
                formatValue: (days) => `${formatNumberID(days)} hari`,
                sub: `dari ${formatNumberID(grid.data.daysInMonth * grid.data.plateCount)} hari-plat · utilisasi ${formatUtilization(
                  totals.rentedDays,
                  grid.data.daysInMonth * grid.data.plateCount,
                )}`,
              },
            ]}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border bg-card p-3 text-xs">
        <span className="font-semibold text-muted-foreground">Legenda:</span>
        {LEGEND.map((item) => (
          <span key={item.tone} className="flex items-center gap-1.5">
            <span
              className={cn('inline-block size-3.5 rounded-sm border', toneSwatch(item.tone))}
            />
            <span className="font-medium">{item.label}</span>
            {item.hint && <span className="text-muted-foreground">({item.hint})</span>}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <MousePointerClick className="size-3.5" aria-hidden />
          Klik sel untuk rincian sewanya
        </span>
      </div>

      {grid.isPending && <p className="text-sm text-muted-foreground">Memuat kalender sewa…</p>}
      {grid.isError && (
        <p className="text-sm text-destructive">Gagal memuat kalender: {grid.error.message}</p>
      )}
      {isEmpty && (
        <EmptyState
          icon={CalendarRange}
          title="Belum ada plat maupun transaksi sewa"
          description="Daftarkan plat Anda, lalu catat transaksi sewanya di Rental Management — kalender ini terisi otomatis."
          action={
            <Link
              to="/partner/rental/management"
              // The target owns required filter params; the schema's own defaults
              // are the honest "no filters" value.
              search={rentalSearchSchema.parse({ month: search.month, year: search.year })}
              className="font-medium text-primary underline underline-offset-2"
            >
              Buka Rental Management
            </Link>
          }
        />
      )}
      {grid.isSuccess && !isEmpty && (
        <div className={grid.isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <RentalDailyGrid
            grid={grid.data}
            onCellClick={(plateNorm, day) => onPatch({ cell: makeCellParam(plateNorm, day) })}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Nominal per hari memakai aturan yang sama dengan Rental Management: harga sewa dihitung tiap
        hari, dan biaya tambahan sekali di hari pertama sewa. Karena itu jumlah satu baris selalu
        sama dengan omset transaksinya. <b>PPN tidak termasuk</b> — pajak dititipkan untuk negara,
        bukan pendapatan. <b>Utilisasi</b> adalah jumlah hari plat tersewa dibagi jumlah hari dalam
        bulan ini.
      </p>

      {openCell && openRow && (
        <RentalDayCellModal
          row={openRow}
          day={openCell.day}
          month={search.month}
          year={search.year}
          onClose={() => onPatch({ cell: undefined })}
        />
      )}
    </div>
  );
}
