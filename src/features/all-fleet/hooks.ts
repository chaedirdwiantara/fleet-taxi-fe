import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import type { MonitoringMode } from '@/features/fleet/searchSchema';
import type { AllFleetCell, AllFleetGrid } from './types';

// All Fleet Monitoring is partner-only: the combined matrix needs Rental data,
// which belongs to a partner (rentals.partner_id). Scoping is server-side.

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export function usePartnerAllFleetGridQuery(p: {
  month: number;
  year: number;
  mode: MonitoringMode;
}) {
  return useQuery({
    queryKey: qk.partner.fleet.allGrid(p),
    queryFn: async (): Promise<AllFleetGrid> => {
      const { data, error } = await api.GET('/partner/portal/fleet/all/grid', {
        params: { query: { month: p.month, year: p.year, mode: p.mode } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as AllFleetGrid;
    },
    placeholderData: keepPreviousData,
  });
}

export function usePartnerAllFleetCellQuery(p: {
  key: string;
  day: number;
  month: number;
  year: number;
  mode: MonitoringMode;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: qk.partner.fleet.allCell({
      key: p.key,
      day: p.day,
      month: p.month,
      year: p.year,
      mode: p.mode,
    }),
    queryFn: async (): Promise<AllFleetCell> => {
      const { data, error } = await api.GET('/partner/portal/fleet/all/cell', {
        params: {
          query: { key: p.key, day: p.day, month: p.month, year: p.year, mode: p.mode },
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as AllFleetCell;
    },
    enabled: p.enabled,
  });
}
