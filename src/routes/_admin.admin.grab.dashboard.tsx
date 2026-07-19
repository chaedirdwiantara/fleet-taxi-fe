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
import { PerformerPanel } from '@/features/fleet/components/PerformerPanel';
import { useGrabSummaryQuery } from '@/features/grab/hooks';
import { currentMonthWIB, currentYearWIB, formatDateTimeWIB, MONTH_NAMES_ID } from '@/lib/datetime';

export const Route = createFileRoute('/_admin/admin/grab/dashboard')({
  component: GrabDashboard,
});

const ALL_PARTNERS = 'all';

function GrabDashboard() {
  const [month, setMonth] = useState(currentMonthWIB());
  const [year, setYear] = useState(currentYearWIB());
  const [partner, setPartner] = useState(ALL_PARTNERS);

  const summary = useGrabSummaryQuery({
    month,
    year,
    rentalPartner: partner === ALL_PARTNERS ? undefined : partner,
  });
  const years = Array.from({ length: 6 }, (_, i) => currentYearWIB() - 4 + i);
  const partnerOptions = summary.data?.availableRentalPartners ?? [];

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
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
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
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
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
      {summary.isSuccess && (
        <div
          className={summary.isFetching ? 'space-y-5 opacity-70 transition-opacity' : 'space-y-5'}
        >
          <GradientStatRow
            cards={[
              {
                label: 'Total Pendapatan Terkumpul',
                value: summary.data.globalSummary.totalEarning,
                icon: Wallet,
                gradient: 'from-blue-500 to-sky-400',
              },
              {
                label: 'Total Tarif Driver',
                value: summary.data.globalSummary.totalDriverFare,
                icon: Car,
                gradient: 'from-emerald-500 to-green-400',
              },
              {
                label: 'Total Insentif',
                value: summary.data.globalSummary.totalIncentive,
                icon: Gift,
                gradient: 'from-orange-500 to-amber-400',
              },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <PlainStat
              icon={<RouteIcon className="size-5" />}
              label="Total Rides"
              value={summary.data.globalSummary.totalRides.toLocaleString('id-ID')}
            />
            <PlainStat
              icon={<CarFront className="size-5" />}
              label="Kendaraan Aktif"
              value={summary.data.globalSummary.activeVehicles.toLocaleString('id-ID')}
            />
          </div>
          <FleetChartsPanel charts={summary.data.charts} />
        </div>
      )}

      <PerformerPanel platform="grab" month={month} year={year} />

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
