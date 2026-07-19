import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Table2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QuickLink } from '@/components/shared/QuickLink';
import { SummaryCards } from '@/features/fleet/components/SummaryCards';
import { FleetChartsPanel } from '@/features/fleet/components/FleetChartsPanel';
import { PerformerPanel } from '@/features/fleet/components/PerformerPanel';
import { useGojekSummaryQuery } from '@/features/fleet/hooks/useFleetQueries';
import { currentMonthWIB, currentYearWIB, MONTH_NAMES_ID } from '@/lib/datetime';

export const Route = createFileRoute('/_admin/admin/gojek/dashboard')({
  component: GojekDashboard,
});

const ALL_PARTNERS = 'all';

function GojekDashboard() {
  const [month, setMonth] = useState(currentMonthWIB());
  const [year, setYear] = useState(currentYearWIB());
  // Default = omset seluruh partner; the select narrows every aggregate to one.
  const [partner, setPartner] = useState(ALL_PARTNERS);

  const summary = useGojekSummaryQuery({
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
          <h2 className="text-lg font-semibold">Gojek Dashboard</h2>
          <p className="text-sm text-muted-foreground">Ringkasan fleet monitoring — Gojek</p>
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
          <SummaryCards
            summary={summary.data.globalSummary}
            exitedDrivers={summary.data.exitedDrivers}
            lastImportDate={summary.data.lastImportDate}
          />
          <FleetChartsPanel charts={summary.data.charts} />
        </div>
      )}

      <PerformerPanel platform="gojek" month={month} year={year} />

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          to="/admin/fleet-monitoring"
          icon={<Table2 className="size-5" />}
          title="Gojek Monitoring"
          desc="Tabel pivot setoran 31 hari, import, exceptions, target."
        />
      </div>
    </div>
  );
}
