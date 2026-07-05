import { createFileRoute, redirect } from '@tanstack/react-router';

// `/partner` → `/partner/dashboard` (routing map, frontend-kickoff.md §4).
export const Route = createFileRoute('/_partner/partner/')({
  beforeLoad: () => {
    throw redirect({ to: '/partner/dashboard' });
  },
});
