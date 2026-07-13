import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { DriverDetailPage } from '@/features/partner/driver/DriverDetailPage';

export const Route = createFileRoute('/_partner/partner/drivers/$id')({
  component: DriverDetailRoute,
});

function DriverDetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  return <DriverDetailPage id={Number(id)} onBack={() => navigate({ to: '/partner/drivers', search: { page: 1 } })} />;
}
