import { createFileRoute, redirect } from '@tanstack/react-router';
import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';

// `/partner` → `/partner/fleet-monitoring` (partner portal = fleet monitoring).
export const Route = createFileRoute('/_partner/partner/')({
  beforeLoad: () => {
    throw redirect({
      to: '/partner/fleet-monitoring',
      search: {
        month: currentMonthWIB(),
        year: currentYearWIB(),
        rentalPartner: [],
        vehicleType: [],
        mode: 'plate',
      },
    });
  },
});
