import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Car, CarFront, Gift, Route as RouteIcon, Table2, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QuickLink } from '@/components/shared/QuickLink';
import { GradientStatRow } from '@/features/fleet/components/GradientStat';
import { FleetChartsPanel } from '@/features/fleet/components/FleetChartsPanel';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { useGrabSummaryQuery } from '@/features/grab/hooks';
import {
  currentMonthWIB,
  currentYearWIB,
  formatDateTimeWIB,
  formatRangeNoteID,
  MONTH_NAMES_ID,
  type DateRangeValue,
} from '@/lib/datetime';

export const Route = createFileRoute('/_admin/admin/grab/dashboard')({
  component: GrabDashboard,
});

const ALL_PARTNERS = 'all';

function GrabDashboard() {
  const [month, setMonth] = useState(currentMonthWIB());
  const [year, setYear] = useState(currentYearWIB());
  const [partner, setPartner] = useState(ALL_PARTNERS);
  // Tanggal filter (undefined = whole month) — resets when the period changes.
  const [range, setRange] = useState<DateRangeValue | undefined>(undefined);

  const changeMonth = (m: number) => {
    setMonth(m);
    setRange(undefined);
  };
  const changeYear = (y: number) => {
    setYear(y);
    setRange(undefined);
  };

  const summary = useGrabSummaryQuery({
    month,
    year,
    ...range,
    rentalPartner: partner === ALL_PARTNERS ? undefined : partner,
  });
  const years = Array.from({ length: 6 }, (_, i) => currentYearWIB() - 4 + i);
  const partnerOptions = summary.data?.availableRentalPartners ?? [];
  // With a range active the cards report the range; otherwise the whole month.
  const stats = summary.data?.range ?? summary.data?.globalSummary;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Grab Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Ringkasan fleet monitoring — Grab
            {summary.data?.lastImportDate
              ? ` · Data terakhir: ${formatDateTimeWIB(summary.data.lastImportDate)}`
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={partner} onValueChange={setPartner}>
            <SelectTrigger className="w-44" aria-label="Rental Partner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PARTNERS}>Semua Partner</SelectItem>
              {partnerOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker
            value={range}
            onChange={setRange}
            month={month}
            year={year}
            className="w-full sm:w-auto"
          />
          <Select value={String(month)} onValueChange={(v) => changeMonth(Number(v))}>
            <SelectTrigger className="w-36" aria-label="Bulan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES_ID.map((name, i) => (
                <SelectItem key={name} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => changeYear(Number(v))}>
            <SelectTrigger className="w-24" aria-label="Tahun">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {summary.isPending && <p className="text-sm text-muted-foreground">Memuat ringkasan…</p>}
      {summary.isError && (
        <p className="text-sm text-destructive">Gagal memuat: {summary.error.message}</p>
      )}
      {summary.isSuccess && stats && (
        <div
          className={summary.isFetching ? 'space-y-5 opacity-70 transition-opacity' : 'space-y-5'}
        >
          <GradientStatRow
            cards={[
              {
                label: 'Total Pendapatan Terkumpul',
                value: stats.totalEarning,
                icon: Wallet,
                gradient: 'from-blue-500 to-sky-400',
                ...(summary.data.range
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
          <div className="grid gap-3 sm:grid-cols-2">
            <PlainStat
              icon={<RouteIcon className="size-5" />}
              label="Total Rides"
              value={stats.totalRides.toLocaleString('id-ID')}
            />
            <PlainStat
              icon={<CarFront className="size-5" />}
              label="Kendaraan Aktif"
              value={stats.activeVehicles.toLocaleString('id-ID')}
            />
          </div>
          <FleetChartsPanel charts={summary.data.charts} range={summary.data.range} />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          to="/admin/fleet-monitoring-grab"
          icon={<Table2 className="size-5" />}
          title="Grab Monitoring"
          desc="Tabel pivot earning per kendaraan (plat · kota · driver)."
        />
      </div>
    </div>
  );
}

function PlainStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span>
          <span className="block text-sm text-muted-foreground">{label}</span>
          <span className="block text-xl font-semibold tabular-nums">{value}</span>
        </span>
      </CardContent>
    </Card>
  );
}
