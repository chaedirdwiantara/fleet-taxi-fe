import { useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { CicilanDepositPage } from '@/features/deposit-installment/CicilanDepositPage';
import {
  cicilanSearchSchema,
  type CicilanSearch,
} from '@/features/deposit-installment/searchSchema';

// Partner portal Cicilan Deposit — installment rules per driver, scoped
// server-side to the partner; payment history derived live from fleet imports.
export const Route = createFileRoute('/_partner/partner/cicilan-deposit')({
  validateSearch: cicilanSearchSchema,
  component: PartnerCicilanDepositPage,
});

function PartnerCicilanDepositPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const onPatch = useCallback(
    (patch: Partial<CicilanSearch>) =>
      navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true }),
    [navigate],
  );

  return <CicilanDepositPage search={search} onPatch={onPatch} />;
}
