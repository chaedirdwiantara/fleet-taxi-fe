import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import type { AdminPlate } from './types';

// Plate Registration (super_admin) — CRUD over the admin console's own plate
// registry. Registering or removing a plate changes which vehicles the admin
// fleet grids show, so every admin fleet query is invalidated on success.
// Backend enforces the super_admin policy (CASL); these hooks just wire the UI.

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export function useAdminPlatesQuery() {
  return useQuery({
    queryKey: qk.admin.plates,
    queryFn: async (): Promise<AdminPlate[]> => {
      const { data, error } = await api.GET('/admin/plates');
      if (error) throwEnvelope(error);
      return unwrap(data) as AdminPlate[];
    },
  });
}

function useInvalidatePlates() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qk.admin.plates });
    void qc.invalidateQueries({ queryKey: qk.fleet.all });
  };
}

export function useRegisterAdminPlate() {
  const invalidate = useInvalidatePlates();
  return useMutation({
    mutationFn: async (body: {
      plateNumber: string;
      vehicleType?: string;
      partnerName?: string;
    }) => {
      const { data, error } = await api.POST('/admin/plates', { body });
      if (error) throwEnvelope(error);
      return unwrap(data) as AdminPlate;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateAdminPlate() {
  const invalidate = useInvalidatePlates();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      plateNumber: string;
      vehicleType?: string;
      partnerName?: string;
    }) => {
      const { data, error } = await api.PUT('/admin/plates/{id}', {
        params: { path: { id: input.id } },
        body: {
          plateNumber: input.plateNumber,
          vehicleType: input.vehicleType,
          partnerName: input.partnerName,
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as AdminPlate;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteAdminPlate() {
  const invalidate = useInvalidatePlates();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await api.DELETE('/admin/plates/{id}', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: invalidate,
  });
}
