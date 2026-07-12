import { createFileRoute } from '@tanstack/react-router';
import { RentalMonitoringPage } from '@/features/rental/RentalMonitoringPage';
import { rentalSearchSchema } from '@/features/rental/searchSchema';

// Partner portal Rental Monitoring — thin route: URL search params in,
// patches out. The page itself lives in features/rental.
export const Route = createFileRoute('/_partner/partner/rental-monitoring')({
  validateSearch: rentalSearchSchema,
  component: RentalMonitoringRoute,
});

function RentalMonitoringRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <RentalMonitoringPage
      search={search}
      onPatch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })}
    />
  );
}
