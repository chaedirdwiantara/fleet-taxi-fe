import { createFileRoute } from '@tanstack/react-router';
import { AllFleetMonitoringPage } from '@/features/all-fleet/AllFleetMonitoringPage';
import { fleetSearchSchema } from '@/features/fleet/searchSchema';

// Partner portal All Fleet Monitoring — thin route: URL search params in,
// patches out. The page itself lives in features/all-fleet.
export const Route = createFileRoute('/_partner/partner/all-fleet-monitoring')({
  validateSearch: fleetSearchSchema,
  component: AllFleetMonitoringRoute,
});

function AllFleetMonitoringRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <AllFleetMonitoringPage
      search={search}
      onPatch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })}
    />
  );
}
