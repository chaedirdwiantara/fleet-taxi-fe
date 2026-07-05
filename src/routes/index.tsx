import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useAdminSession, usePartnerSession } from '@/features/auth/hooks';

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
  if (partner.data) return <Navigate to="/partner/dashboard" replace />;
  return <Navigate to="/admin/login" search={{}} replace />;
}
