import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  api,
  unwrapWithMeta,
  unwrap,
  ApiErrorException,
  type ApiError,
  type Meta,
} from '@/lib/api-client/client';
import { env } from '@/lib/env';
import { qk } from '@/lib/query-client';
import type { DebtFilters, DebtListParams, DebtRow } from './types';

// Debt Summary — read-only queries over /partner/portal/debt-summary. The
// backend aggregates live from the same Gojek/Grab import data behind fleet
// monitoring, scoped server-side to the partner's registered plates.

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

/** Filter params → query-string shape shared by the list + export calls. */
const filterQuery = (p: DebtListParams) => ({
  status: p.status,
  cabang: p.cabang,
  koordinator: p.koordinator,
  search: p.search || undefined,
  sortBy: p.sortBy,
  sortOrder: p.sortOrder,
});

export function useDebtSummaryQuery(params: DebtListParams) {
  return useQuery({
    queryKey: qk.partner.debt.list(params),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<{ data: DebtRow[]; meta?: Meta }> => {
      const { data, error } = await api.GET('/partner/portal/debt-summary', {
        params: {
          query: {
            ...filterQuery(params),
            page: String(params.page),
            pageSize: String(params.pageSize),
          },
        },
      });
      if (error) throwEnvelope(error);
      const { data: rows, meta } = unwrapWithMeta(data);
      return { data: rows as DebtRow[], meta };
    },
  });
}

export function useDebtFiltersQuery() {
  return useQuery({
    queryKey: qk.partner.debt.filters,
    queryFn: async (): Promise<DebtFilters> => {
      const { data, error } = await api.GET('/partner/portal/debt-summary/filters');
      if (error) throwEnvelope(error);
      return unwrap(data) as DebtFilters;
    },
  });
}

/** Streams the filtered XLSX export and triggers a browser download. */
export async function downloadDebtExport(params: DebtListParams): Promise<void> {
  const qs = new URLSearchParams({ format: 'xlsx' });
  for (const [key, value] of Object.entries(filterQuery(params))) {
    if (value !== undefined) qs.set(key, value);
  }
  const res = await fetch(`${env.VITE_API_BASE_URL}/partner/portal/debt-summary/export?${qs}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Export gagal (${res.status})`);

  const blob = await res.blob();
  const filename =
    /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ??
    'debt-summary.xlsx';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
