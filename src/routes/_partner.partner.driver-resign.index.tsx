import { createFileRoute } from '@tanstack/react-router';
import { ResignationsPage } from '@/features/partner/driver/ResignationsPage';
import { resignationSearchSchema } from '@/features/partner/driver/searchSchema';

export const Route = createFileRoute('/_partner/partner/driver-resign/')({
  validateSearch: resignationSearchSchema,
  component: ResignationsRoute,
});

function ResignationsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ResignationsPage
      search={search}
      onPatch={(patch) =>
        navigate({
          search: (prev) => ({ ...prev, ...patch }),
          replace: true,
        })
      }
      onOpenDetail={(id) =>
        navigate({ to: '/partner/driver-resign/$id', params: { id: String(id) } })
      }
    />
  );
}
