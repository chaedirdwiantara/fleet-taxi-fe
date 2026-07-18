import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import type {
  CellBreakdown,
  DriverActivity,
  ExitedDriver,
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
    queryKey: qk.fleet.cell({
      platform: 'gojek',
      key: p.plate,
      day: p.day,
      month: p.month,
      year: p.year,
    }),
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
      const { data, error } = await api.GET(
        p.platform === 'gojek' ? '/admin/fleet/gojek/performers' : '/admin/fleet/grab/performers',
        { params: { query: { month: p.month, year: p.year } } },
      );
      if (error) throwEnvelope(error);
      return unwrap(data) as Performers;
    },
  });
}

/**
 * Monthly aggregates for the /admin dashboard (summary cards + driver
 * activity). `rentalPartner` narrows every aggregate to one partner;
 * `availableRentalPartners` (always computed unfiltered) feeds the select.
 */
export function useGojekSummaryQuery(p: {
  month: number;
  year: number;
  day?: number;
  rentalPartner?: string;
}) {
  return useQuery({
    queryKey: qk.fleet.summary({ platform: 'gojek', ...p }),
    queryFn: async (): Promise<{
      globalSummary: GlobalSummary;
      driverActivity: DriverActivity;
      charts: FleetCharts;
      availableRentalPartners: string[];
      exitedDrivers: ExitedDriver[];
      lastImportDate: string | null;
    }> => {
      const { data, error } = await api.GET('/admin/fleet/gojek/summary', {
        params: {
          query: {
            month: p.month,
            year: p.year,
            ...(p.day ? { day: p.day } : {}),
            ...(p.rentalPartner ? { rentalPartner: [p.rentalPartner] } : {}),
          },
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as {
        globalSummary: GlobalSummary;
        driverActivity: DriverActivity;
        charts: FleetCharts;
        availableRentalPartners: string[];
        exitedDrivers: ExitedDriver[];
        lastImportDate: string | null;
      };
    },
    placeholderData: keepPreviousData,
  });
}

// ---- Partner portal variants (read-only, scoped server-side to own plates) ----
// Same FleetGrid/CellBreakdown/summary shapes as admin; only the endpoint and
// query key differ. The plate allowlist is derived from the session, never sent.

export function usePartnerGojekGridQuery(p: { month: number; year: number }) {
  return useQuery({
    queryKey: qk.partner.fleet.grid({ platform: 'gojek', ...p }),
    queryFn: async (): Promise<FleetGrid> => {
      const { data, error } = await api.GET('/partner/portal/fleet/gojek/grid', {
        params: { query: { month: p.month, year: p.year } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as FleetGrid;
    },
    placeholderData: keepPreviousData,
  });
}

export function usePartnerGojekCellQuery(p: {
  plate: string;
  day: number;
  month: number;
  year: number;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: qk.partner.fleet.cell({
      platform: 'gojek',
      key: p.plate,
      day: p.day,
      month: p.month,
      year: p.year,
    }),
    queryFn: async (): Promise<CellBreakdown> => {
      const { data, error } = await api.GET('/partner/portal/fleet/gojek/cell', {
        params: { query: { plate: p.plate, day: p.day, month: p.month, year: p.year } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as CellBreakdown;
    },
    enabled: p.enabled,
  });
}

export function usePartnerGojekSummaryQuery(p: { month: number; year: number; day?: number }) {
  return useQuery({
    queryKey: qk.partner.fleet.summary(p),
    queryFn: async (): Promise<{
      globalSummary: GlobalSummary;
      driverActivity: DriverActivity;
      charts: FleetCharts;
      exitedDrivers: ExitedDriver[];
      lastImportDate: string | null;
    }> => {
      const { data, error } = await api.GET('/partner/portal/fleet/gojek/summary', {
        params: { query: { month: p.month, year: p.year, ...(p.day ? { day: p.day } : {}) } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as {
        globalSummary: GlobalSummary;
        driverActivity: DriverActivity;
        charts: FleetCharts;
        exitedDrivers: ExitedDriver[];
        lastImportDate: string | null;
      };
    },
    placeholderData: keepPreviousData,
  });
}
