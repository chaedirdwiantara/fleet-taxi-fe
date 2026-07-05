import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';

// Gojek-only (§6.1): exceptions mark rental/maintenance/free-day; the ones
// with isBebasSetoran=true reduce target days — computed server-side.

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

export function useExceptionsQuery(p: { month: number; year: number }) {
  return useQuery({
    queryKey: qk.fleet.exceptions(p),
    queryFn: async (): Promise<FleetException[]> => {
      const { data, error } = await api.GET('/admin/fleet/gojek/exceptions', {
        params: { query: p },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as FleetException[];
    },
  });
}

function useInvalidateExceptions() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['fleet', 'gojek', 'exceptions'] });
    // free-day exceptions change monthly targets → refresh the pivot too
    qc.invalidateQueries({ queryKey: ['fleet', 'gojek', 'grid'] });
  };
}

export function useCreateException() {
  const invalidate = useInvalidateExceptions();
  return useMutation({
    mutationFn: async (input: {
      vehiclePlate: string;
      exceptionDate: string;
      keterangan?: string;
      isBebasSetoran: boolean;
    }) => {
      const { data, error } = await api.POST('/admin/fleet/gojek/exceptions', { body: input });
      if (error) throwEnvelope(error);
      return unwrap(data) as FleetException;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteException() {
  const invalidate = useInvalidateExceptions();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await api.DELETE('/admin/fleet/gojek/exceptions/{id}', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: invalidate,
  });
}
