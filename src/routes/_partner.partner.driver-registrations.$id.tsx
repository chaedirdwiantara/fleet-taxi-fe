import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { RegistrationDetailPage } from '@/features/partner/driver/RegistrationDetailPage';

export const Route = createFileRoute('/_partner/partner/driver-registrations/$id')({
  component: RegistrationDetailRoute,
});

function RegistrationDetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  return (
    <RegistrationDetailPage
      id={Number(id)}
      onBack={() => navigate({ to: '/partner/driver-registrations', search: { page: 1 } })}
      // approval moves the row to the active roster
      onApproved={() => navigate({ to: '/partner/drivers', search: { page: 1 } })}
    />
  );
}
