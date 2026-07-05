import { createFileRoute, Navigate } from '@tanstack/react-router';
import { z } from 'zod';
import { LoginForm } from '@/features/auth/LoginForm';
import { usePartnerSession } from '@/features/auth/hooks';

export const Route = createFileRoute('/partner/login')({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: PartnerLoginPage,
});

function PartnerLoginPage() {
  const { redirect } = Route.useSearch();
  const { data: user, isPending } = usePartnerSession();

  // Already signed in as a partner → skip the form. Ignore a redirect that
  // points back at a login page (would loop).
  const safeRedirect = redirect && !redirect.includes('/login') ? redirect : '/partner/dashboard';
  if (!isPending && user) {
    return <Navigate to={safeRedirect} replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <LoginForm audience="partner" redirect={safeRedirect} />
    </div>
  );
}
