import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { DriverEditPage } from '@/features/partner/driver/DriverEditPage';

export const Route = createFileRoute('/_partner/partner/drivers/$id')({
  component: DriverEditRoute,
});

function DriverEditRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  return (
    <DriverEditPage
      id={Number(id)}
      onBack={() => navigate({ to: '/partner/drivers', search: { page: 1 } })}
    />
  );
}
