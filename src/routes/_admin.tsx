import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router';
import { RequireAdmin } from '@/features/auth/RequireAdmin';
import { AppShell } from '@/components/shared/AppShell';
import { useAdminLogout, useAdminSession } from '@/features/auth/hooks';

// Admin console layout: gated by the admin session, wrapped in the admin shell.
export const Route = createFileRoute('/_admin')({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RequireAdmin>
      <AdminShell />
    </RequireAdmin>
  );
}

function AdminShell() {
  const router = useRouter();
  const { data: user } = useAdminSession();
  const logout = useAdminLogout();
  return (
    <AppShell
      audience="admin"
      user={user}
      logoutPending={logout.isPending}
      onLogout={() =>
        logout.mutate(undefined, { onSuccess: () => router.history.push('/admin/login') })
      }
    >
      <Outlet />
    </AppShell>
  );
}
