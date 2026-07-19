import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Car, Gift, LayoutDashboard, ScrollText, Table2, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickLink } from '@/components/shared/QuickLink';
import { GradientStatRow } from '@/features/fleet/components/GradientStat';
import { useGojekSummaryQuery } from '@/features/fleet/hooks/useFleetQueries';
import { useGrabSummaryQuery } from '@/features/grab/hooks';
import { currentMonthWIB, currentYearWIB, MONTH_NAMES_ID } from '@/lib/datetime';

export const Route = createFileRoute('/_admin/admin/')({
  component: AdminLanding,
});

// Compact cross-platform landing: current-month headline numbers per platform
// plus quick links. Deep analysis lives on the per-platform dashboards.
function AdminLanding() {
  const month = currentMonthWIB();
  const year = currentYearWIB();
  const gojek = useGojekSummaryQuery({ month, year });
  const grab = useGrabSummaryQuery({ month, year });
  const periodLabel = `${MONTH_NAMES_ID[month - 1]} ${year}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard Admin</h2>
        <p className="text-sm text-muted-foreground">Ringkasan Gojek &amp; Grab — {periodLabel}</p>
      </div>

      <PlatformSection
        title="Gojek"
        detailTo="/admin/gojek/dashboard"
        isPending={gojek.isPending}
        isError={gojek.isError}
        errorMessage={gojek.error?.message}
      >
        {gojek.isSuccess && (
          <GradientStatRow
            cards={[
              {
                label: 'Total Setoran',
                value: gojek.data.globalSummary.totalDeduction,
                icon: Wallet,
                gradient: 'from-blue-500 to-sky-400',
              },
              {
                label: 'Total Tagihan',
                value: gojek.data.globalSummary.totalDue,
                icon: Table2,
                gradient: 'from-emerald-500 to-green-400',
              },
              {
                label: 'Total Outstanding',
                value: gojek.data.globalSummary.totalOutstanding,
                icon: Car,
                gradient: 'from-orange-500 to-amber-400',
              },
            ]}
          />
        )}
      </PlatformSection>

      <PlatformSection
        title="Grab"
        detailTo="/admin/grab/dashboard"
        isPending={grab.isPending}
        isError={grab.isError}
        errorMessage={grab.error?.message}
      >
        {grab.isSuccess && (
          <GradientStatRow
            cards={[
              {
                label: 'Total Pendapatan Terkumpul',
                value: grab.data.globalSummary.totalEarning,
                icon: Wallet,
                gradient: 'from-blue-500 to-sky-400',
              },
              {
                label: 'Total Tarif Driver',
                value: grab.data.globalSummary.totalDriverFare,
                icon: Car,
                gradient: 'from-emerald-500 to-green-400',
              },
              {
                label: 'Total Insentif',
                value: grab.data.globalSummary.totalIncentive,
                icon: Gift,
                gradient: 'from-orange-500 to-amber-400',
              },
            ]}
          />
        )}
      </PlatformSection>

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          to="/admin/gojek/dashboard"
          icon={<LayoutDashboard className="size-5" />}
          title="Gojek Dashboard"
          desc="Ringkasan setoran, aktivitas driver, dan grafik bulanan."
        />
        <QuickLink
          to="/admin/fleet-monitoring"
          icon={<Table2 className="size-5" />}
          title="Gojek Monitoring"
          desc="Tabel pivot setoran 31 hari, import, exceptions, target."
        />
        <QuickLink
          to="/admin/grab/dashboard"
          icon={<LayoutDashboard className="size-5" />}
          title="Grab Dashboard"
          desc="Ringkasan pendapatan, insentif, dan grafik bulanan."
        />
        <QuickLink
          to="/admin/fleet-monitoring-grab"
          icon={<ScrollText className="size-5" />}
          title="Grab Monitoring"
          desc="Tabel pivot earning per kendaraan (plat · kota · driver)."
        />
      </div>
    </div>
  );
}

function PlatformSection({
  title,
  detailTo,
  isPending,
  isError,
  errorMessage,
  children,
}: {
  title: string;
  detailTo: string;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Link
          to={detailTo}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Lihat dashboard
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">Gagal memuat ringkasan: {errorMessage}</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
