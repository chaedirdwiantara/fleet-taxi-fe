import { createFileRoute } from '@tanstack/react-router';
import { RentalManagementPage } from '@/features/rental/RentalManagementPage';
import { rentalSearchSchema } from '@/features/rental/searchSchema';

// Partner portal Rental Management (the transaction ledger) — thin route: URL
// search params in, patches out. The page itself lives in features/rental.
export const Route = createFileRoute('/_partner/partner/rental/management')({
  validateSearch: rentalSearchSchema,
  component: RentalManagementRoute,
});

function RentalManagementRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <RentalManagementPage
      search={search}
      onPatch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })}
    />
  );
}
