import { createFileRoute, redirect } from '@tanstack/react-router';
import { cicilanSearchSchema } from '@/features/deposit-installment/searchSchema';

// Legacy path — the page is now `/partner/cicilan` (its scope grew beyond
// deposit). Kept as a redirect so older bookmarks keep working, filter and
// sort params included.
export const Route = createFileRoute('/_partner/partner/cicilan-deposit')({
  validateSearch: cicilanSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/partner/cicilan', search, replace: true });
  },
});
