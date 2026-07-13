import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ResignationDetailPage } from '@/features/partner/driver/ResignationDetailPage';

export const Route = createFileRoute('/_partner/partner/driver-resign/$id')({
  component: ResignationDetailRoute,
});

function ResignationDetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  return (
    <ResignationDetailPage
      id={Number(id)}
      onBack={() => navigate({ to: '/partner/driver-resign', search: { page: 1 } })}
    />
  );
}
