import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk, type Platform } from '@/lib/query-client';

// A single fleet_import_details row — prefill for the Edit form when the row is
// a "Manual Payment tanpa plat" synthetic row (one detail per row).
export type FleetDetail = {
  id: number;
  driverName: string | null;
  vehiclePlate: string | null;
  vehiclePlateNorm: string | null;
  type: string | null;
  isManualPayment: boolean;
  isManualPaymentSetoran: number | null; // 1 = Masuk, 0 = Tidak Masuk, null = n/a
  manualPaymentNote: string | null;
  periodMonth: number;
  periodYear: number;
};

// Edit an import detail (assign a plate to a manual row, toggle setoran) OR
// rename/re-plate every detail of a plated vehicle in a period.
export type EditDriverInput = {
  detailId?: number;
  plate?: string;
  month?: number;
  year?: number;
  driverName?: string;
  vehiclePlate?: string;
  isManualPaymentSetoran?: 0 | 1;
  manualPaymentNote?: string;
};

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export function useDetailQuery(
  platform: Platform,
  detailId: number | null,
  period?: { month: number; year: number },
) {
  return useQuery({
    queryKey: qk.fleet.detail(platform, detailId ?? 0),
    queryFn: async (): Promise<FleetDetail> => {
      const { data, error } = await api.GET('/admin/fleet/gojek/details/{detailId}', {
        params: {
          path: { detailId: detailId! },
          query: period ? { month: String(period.month), year: String(period.year) } : {},
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as FleetDetail;
    },
    // gojek-only endpoint; manual-row edit never happens on the grab grid
    enabled: platform === 'gojek' && detailId !== null,
  });
}

export function useEditDriver(platform: Platform) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EditDriverInput) => {
      const { data, error } = await api.POST('/admin/fleet/gojek/edit-driver', {
        body: input,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as { updated: number };
    },
    onSuccess: (_data, input) => {
      // detail edits change the pivot (re-plating merges a manual row into a
      // plate; setoran toggle moves money in/out of the counted totals).
      qc.invalidateQueries({ queryKey: ['fleet', platform, 'grid'] });
      if (input.detailId != null) {
        qc.invalidateQueries({ queryKey: qk.fleet.detail(platform, input.detailId) });
      }
    },
  });
}
