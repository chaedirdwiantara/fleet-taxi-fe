import type { ReactNode } from 'react';
import { Navigate, useLocation } from '@tanstack/react-router';
import { useAdminSession } from './hooks';

// Gate for the admin console. UX-only (the backend enforces real authz):
// unauthenticated admins are sent to the admin login, not the partner one.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useAdminSession();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Memuat sesi…
      </div>
    );
  }
  if (!user) {
    // during the redirect transition this guard briefly re-renders at the
    // login path; render nothing there so it doesn't clobber the redirect param
    if (location.pathname === '/admin/login') return null;
    return <Navigate to="/admin/login" search={{ redirect: location.pathname }} replace />;
  }
  return <>{children}</>;
}
