import { useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { DebtSummaryPage } from '@/features/debt/DebtSummaryPage';
import { debtSearchSchema, type DebtSearch } from '@/features/debt/searchSchema';

// Partner portal Debt Summary — read-only, scoped server-side to the partner's
// registered plates. Aggregated live from the Gojek/Grab fleet-monitoring data.
export const Route = createFileRoute('/_partner/partner/debt-summary')({
  validateSearch: debtSearchSchema,
  component: PartnerDebtSummaryPage,
});

function PartnerDebtSummaryPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const onPatch = useCallback(
    (patch: Partial<DebtSearch>) =>
      navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true }),
    [navigate],
  );

  return <DebtSummaryPage search={search} onPatch={onPatch} />;
}
