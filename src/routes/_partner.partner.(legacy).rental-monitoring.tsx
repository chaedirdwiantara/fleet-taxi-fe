import { createFileRoute, redirect } from '@tanstack/react-router';
import { rentalSearchSchema } from '@/features/rental/searchSchema';

// Legacy path. "Rental Monitoring" used to be the transaction ledger; it now
// lives under the Rental menu as "Rental Management", and the Monitoring name
// belongs to the plate × day pivot. Bookmarks and old links keep working —
// validating the search first means the month/year the reader had selected
// travels with them instead of being dropped on the floor.
//
// The `(legacy)` route GROUP is load-bearing, not decoration: it is stripped
// from the URL but not from the generated identifier, and without it the route
// generator derives the same name for `rental-monitoring` as for
// `rental/monitoring` and the build fails on a duplicate declaration.
export const Route = createFileRoute('/_partner/partner/(legacy)/rental-monitoring')({
  validateSearch: rentalSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/partner/rental/management', search, replace: true });
  },
});
