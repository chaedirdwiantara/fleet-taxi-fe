import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router';
import { RequirePartner } from '@/features/auth/RequirePartner';
import { AppShell } from '@/components/shared/AppShell';
import { usePartnerLogout, usePartnerSession } from '@/features/auth/hooks';

// Partner portal layout: gated by the partner session, wrapped in the shell.
export const Route = createFileRoute('/_partner')({
  component: PartnerLayout,
});

function PartnerLayout() {
  return (
    <RequirePartner>
      <PartnerShell />
    </RequirePartner>
  );
}

function PartnerShell() {
  const router = useRouter();
  const { data: user } = usePartnerSession();
  const logout = usePartnerLogout();
  return (
    <AppShell
      audience="partner"
      user={user}
      logoutPending={logout.isPending}
      onLogout={() =>
        logout.mutate(undefined, { onSuccess: () => router.history.push('/partner/login') })
      }
    >
      <Outlet />
    </AppShell>
  );
}
