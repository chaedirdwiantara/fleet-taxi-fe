import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Car, Table2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SummaryCards } from '@/features/fleet/components/SummaryCards';
import { FleetChartsPanel } from '@/features/fleet/components/FleetChartsPanel';
import { DriverActivityPanel } from '@/features/fleet/components/DriverActivityPanel';
import { PerformerPanel } from '@/features/fleet/components/PerformerPanel';
import { useGojekSummaryQuery } from '@/features/fleet/hooks/useFleetQueries';
import { currentMonthWIB, currentYearWIB, MONTH_NAMES_ID } from '@/lib/datetime';

export const Route = createFileRoute('/_admin/admin/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [month, setMonth] = useState(currentMonthWIB());
  const [year, setYear] = useState(currentYearWIB());
  const [day, setDay] = useState<number | undefined>(undefined);

  const summary = useGojekSummaryQuery({ month, year, day });
  const years = Array.from({ length: 6 }, (_, i) => currentYearWIB() - 4 + i);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Dashboard Admin</h2>
          <p className="text-sm text-muted-foreground">Ringkasan fleet monitoring — Gojek</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(month)} onValueChange={(v) => { setMonth(Number(v)); setDay(undefined); }}>
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
          <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setDay(undefined); }}>
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
        <div className={summary.isFetching ? 'space-y-5 opacity-70 transition-opacity' : 'space-y-5'}>
          <SummaryCards summary={summary.data.globalSummary} />
          <FleetChartsPanel charts={summary.data.charts} />
          <DriverActivityPanel
            activity={summary.data.driverActivity}
            month={month}
            year={year}
            onDayChange={setDay}
          />
        </div>
      )}

      <PerformerPanel platform="gojek" month={month} year={year} />

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          to="/admin/fleet-monitoring"
          icon={<Table2 className="size-5" />}
          title="Fleet Monitoring — Gojek"
          desc="Tabel pivot setoran 31 hari, import, exceptions, target."
        />
        <QuickLink
          to="/admin/fleet-monitoring-grab"
          icon={<Car className="size-5" />}
          title="Fleet Monitoring — Grab"
          desc="Tabel pivot earning per kendaraan (plat · kota · driver)."
        />
      </div>
    </div>
  );
}

function QuickLink({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link to={to}>
      <Card className="py-4 transition-colors hover:border-primary/50 hover:bg-accent/30">
        <CardContent className="flex items-center gap-3 px-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{title}</span>
            <span className="block text-sm text-muted-foreground">{desc}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </CardContent>
      </Card>
    </Link>
  );
}
