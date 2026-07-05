import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk, type Platform } from '@/lib/query-client';

export type FleetTarget = {
  vehiclePlate: string;
  vehiclePlateNorm: string;
  driverName: string | null;
  vehicleType: string | null;
  fleetTarget: number | null; // integer rupiah daily target; null/0 = inferred
  rentalPartner: string | null;
  deliveryBatch: string | null;
  serviceArea: string | null;
  regionId: number | null;
  city: string | null;
};

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export function useTargetQuery(platform: Platform, plate: string | null) {
  return useQuery({
    queryKey: qk.fleet.target(platform, plate ?? ''),
    queryFn: async (): Promise<FleetTarget> => {
      const { data, error } = await api.GET('/admin/fleet/{platform}/targets/{plate}', {
        params: { path: { platform, plate: plate! } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as FleetTarget;
    },
    enabled: plate !== null,
  });
}

export type UpdateTargetInput = {
  driverName?: string;
  vehicleType?: string;
  /** integer rupiah; 0 = clear → server infers from `due` rows (brief §2.A) */
  fleetTarget?: number;
  rentalPartner?: string;
  deliveryBatch?: string;
  serviceArea?: string;
};

export function useUpdateTarget(platform: Platform) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { plate: string; patch: UpdateTargetInput }) => {
      const { data, error } = await api.PUT('/admin/fleet/{platform}/targets/{plate}', {
        params: { path: { platform, plate: input.plate } },
        body: input.patch,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as FleetTarget;
    },
    onSuccess: (updated, { plate }) => {
      qc.setQueryData(qk.fleet.target(platform, plate), updated);
      // target metadata feeds the pivot's computed columns → refetch
      qc.invalidateQueries({ queryKey: ['fleet', platform, 'grid'] });
    },
  });
}
