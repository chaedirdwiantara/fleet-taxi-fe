import { createFileRoute, redirect } from '@tanstack/react-router';
import { fleetSearchSchema } from '@/features/fleet/searchSchema';

// `/partner` → All Fleet Monitoring: the whole fleet's income in one matrix is
// the partner's "how did we do" overview, so it is what the portal opens on.
// The per-platform screens below it are the drill-downs.
//
// The target owns required search params; the schema's own defaults are the
// honest "no filters, current WIB month" value — no second copy of them here.
export const Route = createFileRoute('/_partner/partner/')({
  beforeLoad: () => {
    throw redirect({
      to: '/partner/all-fleet-monitoring',
      search: fleetSearchSchema.parse({}),
    });
  },
});
