import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import type { PartnerPlate } from './types';

// Daftarkan Plat — CRUD over the partner's own registered plates. Registering
// or removing a plate changes what the scoped fleet grids show, so those
// queries (['partner','fleet',...]) are invalidated on success.

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export function usePartnerPlatesQuery() {
  return useQuery({
    queryKey: qk.partner.plates,
    queryFn: async (): Promise<PartnerPlate[]> => {
      const { data, error } = await api.GET('/partner/portal/plates');
      if (error) throwEnvelope(error);
      return unwrap(data) as PartnerPlate[];
    },
  });
}

export function useRegisterPlate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { plateNumber: string; vehicleType?: string }) => {
      const { data, error } = await api.POST('/partner/portal/plates', { body });
      if (error) throwEnvelope(error);
      return unwrap(data) as PartnerPlate;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.partner.plates });
      void qc.invalidateQueries({ queryKey: ['partner', 'fleet'] });
    },
  });
}

export function useUpdatePlate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; plateNumber: string; vehicleType?: string }) => {
      const { data, error } = await api.PUT('/partner/portal/plates/{id}', {
        params: { path: { id: input.id } },
        body: { plateNumber: input.plateNumber, vehicleType: input.vehicleType },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as PartnerPlate;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.partner.plates });
      void qc.invalidateQueries({ queryKey: ['partner', 'fleet'] });
    },
  });
}

export function useDeletePlate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await api.DELETE('/partner/portal/plates/{id}', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.partner.plates });
      void qc.invalidateQueries({ queryKey: ['partner', 'fleet'] });
    },
  });
}
