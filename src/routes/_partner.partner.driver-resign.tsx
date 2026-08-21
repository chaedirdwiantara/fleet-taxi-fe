import { createFileRoute } from '@tanstack/react-router';
import { ResignedDriversPage } from '@/features/partner/driver/ResignedDriversPage';
import { resignedDriverSearchSchema } from '@/features/partner/driver/searchSchema';

// Own top-level path (not /partner/drivers/resign) so the sidebar's prefix
// matching keeps "Daftar Driver" and "Driver Resign" mutually exclusive.
export const Route = createFileRoute('/_partner/partner/driver-resign')({
  validateSearch: resignedDriverSearchSchema,
  component: ResignedDriversRoute,
});

function ResignedDriversRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ResignedDriversPage
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
