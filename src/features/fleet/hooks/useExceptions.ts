import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';

// Gojek-only (§6.1): exceptions mark rental/maintenance/free-day; the ones
// with isBebasSetoran=true reduce target days — computed server-side.
// Two scopes share the shapes: 'admin' hits /admin/fleet/gojek/exceptions,
// 'partner' hits /partner/portal/fleet/gojek/exceptions (server-side limited
// to the session partner's registered plates).

export type ExceptionScope = 'admin' | 'partner';

export type FleetException = {
  id: number;
  vehiclePlate: string;
  exceptionDate: string; // YYYY-MM-DD (WIB business date)
  keterangan: string | null;
  isBebasSetoran: boolean;
};

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export function useExceptionsQuery(p: { month: number; year: number; scope?: ExceptionScope }) {
  const scope: ExceptionScope = p.scope ?? 'admin';
  return useQuery({
    queryKey:
      scope === 'partner'
        ? qk.partner.fleet.exceptions({ month: p.month, year: p.year })
        : qk.fleet.exceptions({ month: p.month, year: p.year }),
    queryFn: async (): Promise<FleetException[]> => {
      const query = { month: String(p.month), year: String(p.year) };
      const { data, error } =
        scope === 'partner'
          ? await api.GET('/partner/portal/fleet/gojek/exceptions', { params: { query } })
          : await api.GET('/admin/fleet/gojek/exceptions', { params: { query } });
      if (error) throwEnvelope(error);
      return unwrap(data) as FleetException[];
    },
  });
}

function useInvalidateExceptions(scope: ExceptionScope) {
  const qc = useQueryClient();
  return () => {
    if (scope === 'partner') {
      qc.invalidateQueries({ queryKey: ['partner', 'fleet', 'gojek', 'exceptions'] });
      // free-day exceptions change monthly targets → refresh the partner pivot
      qc.invalidateQueries({ queryKey: ['partner', 'fleet', 'gojek', 'grid'] });
      qc.invalidateQueries({ queryKey: ['partner', 'fleet', 'gojek', 'summary'] });
    } else {
      qc.invalidateQueries({ queryKey: ['fleet', 'gojek', 'exceptions'] });
      qc.invalidateQueries({ queryKey: ['fleet', 'gojek', 'grid'] });
    }
  };
}

export function useCreateException(scope: ExceptionScope = 'admin') {
  const invalidate = useInvalidateExceptions(scope);
  return useMutation({
    mutationFn: async (input: {
      vehiclePlate: string;
      exceptionDate: string;
      keterangan?: string;
      isBebasSetoran: boolean;
    }) => {
      const { data, error } =
        scope === 'partner'
          ? await api.POST('/partner/portal/fleet/gojek/exceptions', { body: input })
          : await api.POST('/admin/fleet/gojek/exceptions', { body: input });
      if (error) throwEnvelope(error);
      return unwrap(data) as FleetException;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteException(scope: ExceptionScope = 'admin') {
  const invalidate = useInvalidateExceptions(scope);
  return useMutation({
    mutationFn: async (id: number) => {
      const params = { path: { id } };
      const { data, error } =
        scope === 'partner'
          ? await api.DELETE('/partner/portal/fleet/gojek/exceptions/{id}', { params })
          : await api.DELETE('/admin/fleet/gojek/exceptions/{id}', { params });
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: invalidate,
  });
}
