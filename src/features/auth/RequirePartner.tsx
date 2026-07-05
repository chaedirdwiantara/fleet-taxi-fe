import type { ReactNode } from 'react';
import { Navigate, useLocation } from '@tanstack/react-router';
import { usePartnerSession } from './hooks';

// Gate for the partner portal. Unauthenticated partners are sent to the
// partner login (a distinct surface from the admin console).
export function RequirePartner({ children }: { children: ReactNode }) {
  const { data: user, isPending } = usePartnerSession();
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
    if (location.pathname === '/partner/login') return null;
    return <Navigate to="/partner/login" search={{ redirect: location.pathname }} replace />;
  }
  return <>{children}</>;
}
