import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useAdminSession, usePartnerSession } from '@/features/auth/hooks';
import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';

const fleetSearchDefaults = {
  month: currentMonthWIB(),
  year: currentYearWIB(),
  rentalPartner: [] as string[],
};

// Root: route by whichever session resolves. Admin console takes precedence;
// otherwise a partner session; otherwise the admin login as the default entry.
export const Route = createFileRoute('/')({
  component: RootRedirect,
});

function RootRedirect() {
  const admin = useAdminSession();
  const partner = usePartnerSession();

  if (admin.isPending || partner.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Memuat sesi…
      </div>
    );
  }

  if (admin.data) return <Navigate to="/admin" replace />;
  if (partner.data)
    return <Navigate to="/partner/fleet-monitoring" search={fleetSearchDefaults} replace />;
  return <Navigate to="/admin/login" search={{}} replace />;
}
