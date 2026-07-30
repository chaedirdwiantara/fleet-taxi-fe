import { useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { CicilanPage } from '@/features/deposit-installment/CicilanPage';
import {
  cicilanSearchSchema,
  type CicilanSearch,
} from '@/features/deposit-installment/searchSchema';

// Partner portal Cicilan — installment rules per driver (deposit, e-tilang,
// COP, kontrakan, …), scoped server-side to the partner; payment history
// derived live from fleet imports.
export const Route = createFileRoute('/_partner/partner/cicilan')({
  validateSearch: cicilanSearchSchema,
  component: PartnerCicilanPage,
});

function PartnerCicilanPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const onPatch = useCallback(
    (patch: Partial<CicilanSearch>) =>
      navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true }),
    [navigate],
  );

  return <CicilanPage search={search} onPatch={onPatch} />;
}
