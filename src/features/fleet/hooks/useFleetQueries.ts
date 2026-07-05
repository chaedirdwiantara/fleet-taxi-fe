import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import type {
  CellBreakdown,
  DriverActivity,
  FleetCharts,
  FleetGrid,
  GlobalSummary,
  Performers,
} from '../types';

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export function useGojekGridQuery(p: {
  month: number;
  year: number;
  rentalPartner: string[];
  plate?: string;
}) {
  return useQuery({
    queryKey: qk.fleet.grid({ platform: 'gojek', ...p }),
    queryFn: async (): Promise<FleetGrid> => {
      const { data, error } = await api.GET('/admin/fleet/gojek/grid', {
        params: {
          query: {
            month: p.month,
            year: p.year,
            ...(p.rentalPartner.length ? { rentalPartner: p.rentalPartner } : {}),
            ...(p.plate ? { plate: p.plate } : {}),
          },
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as FleetGrid;
    },
    placeholderData: keepPreviousData,
  });
}

export function useGojekCellQuery(p: {
  plate: string;
  day: number;
  month: number;
  year: number;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: qk.fleet.cell({ platform: 'gojek', key: p.plate, day: p.day, month: p.month, year: p.year }),
    queryFn: async (): Promise<CellBreakdown> => {
      const { data, error } = await api.GET('/admin/fleet/gojek/cell', {
        params: { query: { plate: p.plate, day: p.day, month: p.month, year: p.year } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as CellBreakdown;
    },
    enabled: p.enabled,
  });
}

export function usePerformersQuery(p: { platform: 'gojek' | 'grab'; month: number; year: number }) {
  return useQuery({
    queryKey: qk.fleet.performers(p),
    queryFn: async (): Promise<Performers> => {
      const { data, error } = await api.GET('/admin/fleet/{platform}/performers', {
        params: { path: { platform: p.platform }, query: { month: p.month, year: p.year } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as Performers;
    },
  });
}

/** Monthly aggregates for the /admin dashboard (summary cards + driver activity). */
export function useGojekSummaryQuery(p: { month: number; year: number; day?: number }) {
  return useQuery({
    queryKey: qk.fleet.summary({ platform: 'gojek', ...p }),
    queryFn: async (): Promise<{
      globalSummary: GlobalSummary;
      driverActivity: DriverActivity;
      charts: FleetCharts;
    }> => {
      const { data, error } = await api.GET('/admin/fleet/gojek/summary', {
        params: { query: { month: p.month, year: p.year, ...(p.day ? { day: p.day } : {}) } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as {
        globalSummary: GlobalSummary;
        driverActivity: DriverActivity;
        charts: FleetCharts;
      };
    },
    placeholderData: keepPreviousData,
  });
}
