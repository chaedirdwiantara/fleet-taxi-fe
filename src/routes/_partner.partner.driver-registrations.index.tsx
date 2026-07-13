import { createFileRoute } from '@tanstack/react-router';
import { RegistrationsPage } from '@/features/partner/driver/RegistrationsPage';
import { registrationSearchSchema } from '@/features/partner/driver/searchSchema';

// Thin route: URL search params in, patches + detail navigation out.
export const Route = createFileRoute('/_partner/partner/driver-registrations/')({
  validateSearch: registrationSearchSchema,
  component: RegistrationsRoute,
});

function RegistrationsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <RegistrationsPage
      search={search}
      onPatch={(patch) =>
        navigate({
          search: (prev) => ({ ...prev, ...patch }),
          replace: true,
        })
      }
      onOpenDetail={(id) =>
        navigate({ to: '/partner/driver-registrations/$id', params: { id: String(id) } })
      }
    />
  );
}
