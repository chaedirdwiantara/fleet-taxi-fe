import { createFileRoute } from '@tanstack/react-router';
import { DriversPage } from '@/features/partner/driver/DriversPage';
import { driverSearchSchema } from '@/features/partner/driver/searchSchema';

export const Route = createFileRoute('/_partner/partner/drivers/')({
  validateSearch: driverSearchSchema,
  component: DriversRoute,
});

function DriversRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <DriversPage
      search={search}
      onPatch={(patch) =>
        navigate({
          search: (prev) => ({ ...prev, ...patch }),
          replace: true,
        })
      }
      onOpenDetail={(id) => navigate({ to: '/partner/drivers/$id', params: { id: String(id) } })}
    />
  );
}
