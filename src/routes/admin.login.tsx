import { createFileRoute, Navigate } from '@tanstack/react-router';
import { z } from 'zod';
import { LoginForm } from '@/features/auth/LoginForm';
import { useAdminSession } from '@/features/auth/hooks';

export const Route = createFileRoute('/admin/login')({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { redirect } = Route.useSearch();
  const { data: user, isPending } = useAdminSession();

  // Already signed in as an admin → skip the form. Ignore a redirect that
  // points back at a login page (would loop).
  const safeRedirect = redirect && !redirect.includes('/login') ? redirect : '/admin';
  if (!isPending && user) {
    return <Navigate to={safeRedirect} replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <LoginForm audience="admin" redirect={safeRedirect} />
    </div>
  );
}
