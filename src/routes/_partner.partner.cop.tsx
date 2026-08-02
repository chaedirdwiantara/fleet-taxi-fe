import { useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { CopPage } from '@/features/deposit-installment/CopPage';
import { copSearchSchema, type CopSearch } from '@/features/deposit-installment/copSearchSchema';

// Partner portal Car Ownership Program — read-only report over the COP-titled
// cicilan rules, scoped server-side to the partner. Sits at /partner/cop rather
// than under /partner/cicilan so the sidebar's prefix matching lights exactly
// one menu item.
export const Route = createFileRoute('/_partner/partner/cop')({
  validateSearch: copSearchSchema,
  component: PartnerCopPage,
});

function PartnerCopPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const onPatch = useCallback(
    (patch: Partial<CopSearch>) =>
      navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true }),
    [navigate],
  );

  return <CopPage search={search} onPatch={onPatch} />;
}
