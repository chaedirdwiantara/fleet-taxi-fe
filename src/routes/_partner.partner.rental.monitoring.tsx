import { createFileRoute } from '@tanstack/react-router';
import { RentalDailyGridPage } from '@/features/rental/RentalDailyGridPage';
import { rentalGridSearchSchema } from '@/features/rental/gridSearchSchema';

// Partner portal Rental Monitoring (the plate × day pivot) — thin route: URL
// search params in, patches out. The page itself lives in features/rental.
export const Route = createFileRoute('/_partner/partner/rental/monitoring')({
  validateSearch: rentalGridSearchSchema,
  component: RentalMonitoringRoute,
});

function RentalMonitoringRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <RentalDailyGridPage
      search={search}
      onPatch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })}
    />
  );
}
