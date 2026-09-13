import { Link } from '@tanstack/react-router';
import { AlertTriangle, Table2 } from 'lucide-react';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { Button } from '@/components/ui/button';
import { useAdminSession } from '@/features/auth/hooks';
import { RunHistoryTable } from './components/RunHistoryTable';
import { RunNowCard } from './components/RunNowCard';
import { SettingsForm } from './components/SettingsForm';
import { StatusOverview } from './components/StatusOverview';
import { useGojekPortalSettingsQuery, useGojekPortalStatusQuery } from './hooks';
import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';

// The monitoring route validates its search params; land on the current period.
const MONITORING_SEARCH = {
  month: currentMonthWIB(),
  year: currentYearWIB(),
  rentalPartner: [] as string[],
  vehicleType: [] as string[],
  mode: 'plate' as const,
};

/**
 * super_admin-only: automatic pull of the Gojek "Transaction History for
 * Reconciliation" report from the Fleet Partner Portal into Gojek Monitoring.
 * The role gate here is UX; the backend CASL policy is the real authority.
 */
export function GojekPortalSyncPage() {
  const { data: session } = useAdminSession();
  const isSuperAdmin = (session?.roles ?? []).includes('super_admin');
  const settings = useGojekPortalSettingsQuery();
  const status = useGojekPortalStatusQuery();

  if (!isSuperAdmin) return <AccessDenied what="Sinkronisasi Portal Gojek" />;

  const loadError = settings.error ?? status.error;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sinkronisasi Portal Gojek</h2>
          <p className="text-sm text-muted-foreground">
            Tarik laporan setoran dari Fleet Partner Portal secara otomatis — hasilnya sama persis
            dengan upload manual di Gojek Monitoring.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/fleet-monitoring" search={MONITORING_SEARCH}>
            <Table2 aria-hidden /> Gojek Monitoring
          </Link>
        </Button>
      </div>

      {settings.data && !settings.data.encryptionConfigured && (
        <div
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Server belum memiliki{' '}
            <code className="font-mono text-xs">GOJEK_PORTAL_ENCRYPTION_KEY</code>. Kata sandi
            portal belum bisa disimpan dan jadwal tidak akan berjalan sampai kunci itu didaftarkan.
          </p>
        </div>
      )}

      {loadError && (
        <p className="text-sm text-destructive" role="alert">
          Gagal memuat: {loadError.message}
        </p>
      )}

      <StatusOverview
        status={status.data}
        settings={settings.data}
        isPending={settings.isPending || status.isPending}
      />

      {settings.data && (
        <div className="grid gap-4 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <SettingsForm settings={settings.data} />
          </div>
          <div className="xl:col-span-2">
            <RunNowCard
              status={status.data}
              lookbackDays={settings.data.lookbackDays}
              canRun={
                !!settings.data.email &&
                settings.data.hasPassword &&
                settings.data.encryptionConfigured
              }
            />
          </div>
        </div>
      )}

      <RunHistoryTable />
    </div>
  );
}
