import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { AudienceTheme } from '@/components/shared/AudienceTheme';

export const Route = createRootRoute({
  component: () => (
    <>
      {/* Renders nothing — it only tags <html> with the current audience, so the
          admin console stays brand red and the partner portal turns blue. */}
      <AudienceTheme />
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  ),
});
