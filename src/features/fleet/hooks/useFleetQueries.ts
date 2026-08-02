import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import type { MonitoringMode } from '../searchSchema';
import type {
  CellBreakdown,
  DriverActivity,
  ExitedDriver,
  FleetCharts,
  FleetGrid,
  GlobalSummary,
  RangeSummary,
} from '../types';

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

/**
 * The two TableFilterBar params, omitted when unset so an untouched filter never
 * appears in the request (and the query key stays comparable). Shared by both
 * platforms and both surfaces — the backend applies them identically.
 */
export function gridFilterQuery(p: { q?: string; vehicleType?: string[] }) {
  return {
    ...(p.q ? { q: p.q } : {}),
    ...(p.vehicleType?.length ? { vehicleType: p.vehicleType } : {}),
  };
}

export function useGojekGridQuery(p: {
  month: number;
  year: number;
  rentalPartner: string[];
  q?: string;
  vehicleType?: string[];
  mode?: MonitoringMode;
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
            ...gridFilterQuery(p),
            ...(p.mode ? { mode: p.mode } : {}),
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
  mode?: MonitoringMode;
}) {
  return useQuery({
    queryKey: qk.fleet.cell({
      platform: 'gojek',
      key: p.plate,
      day: p.day,
      month: p.month,
      year: p.year,
      mode: p.mode,
    }),
    queryFn: async (): Promise<CellBreakdown> => {
      const { data, error } = await api.GET('/admin/fleet/gojek/cell', {
        params: {
          query: {
            plate: p.plate,
            day: p.day,
            month: p.month,
            year: p.year,
            ...(p.mode ? { mode: p.mode } : {}),
          },
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as CellBreakdown;
    },
    enabled: p.enabled,
  });
}

// Shared summary payload (admin adds availableRentalPartners on top).
// `range` appears only when the request carried ?dateFrom&dateTo (the Tanggal
// filter); everything else keeps whole-month semantics.
type GojekSummaryResponse = {
  globalSummary: GlobalSummary;
  range?: RangeSummary;
  driverActivity: DriverActivity;
  charts: FleetCharts;
  exitedDrivers: ExitedDriver[];
  lastImportDate: string | null;
};

/**
 * Monthly aggregates for the /admin dashboard (summary cards + driver
 * activity). `rentalPartner` narrows every aggregate to one partner;
 * `availableRentalPartners` (always computed unfiltered) feeds the select.
 * `dateFrom`/`dateTo` add the Tanggal-filter aggregates (`range`).
 */
export function useGojekSummaryQuery(p: {
  month: number;
  year: number;
  dateFrom?: string;
  dateTo?: string;
  rentalPartner?: string;
}) {
  return useQuery({
    queryKey: qk.fleet.summary({ platform: 'gojek', ...p }),
    queryFn: async (): Promise<GojekSummaryResponse & { availableRentalPartners: string[] }> => {
      const { data, error } = await api.GET('/admin/fleet/gojek/summary', {
        params: {
          query: {
            month: p.month,
            year: p.year,
            ...(p.dateFrom && p.dateTo ? { dateFrom: p.dateFrom, dateTo: p.dateTo } : {}),
            ...(p.rentalPartner ? { rentalPartner: [p.rentalPartner] } : {}),
          },
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as GojekSummaryResponse & { availableRentalPartners: string[] };
    },
    placeholderData: keepPreviousData,
  });
}

// ---- Partner portal variants (read-only, scoped server-side to own plates) ----
// Same FleetGrid/CellBreakdown/summary shapes as admin; only the endpoint and
// query key differ. The plate allowlist is derived from the session, never sent.

export function usePartnerGojekGridQuery(p: {
  month: number;
  year: number;
  mode?: MonitoringMode;
  q?: string;
  vehicleType?: string[];
}) {
  return useQuery({
    queryKey: qk.partner.fleet.grid({ platform: 'gojek', ...p }),
    queryFn: async (): Promise<FleetGrid> => {
      const { data, error } = await api.GET('/partner/portal/fleet/gojek/grid', {
        params: {
          query: {
            month: p.month,
            year: p.year,
            ...(p.mode ? { mode: p.mode } : {}),
            ...gridFilterQuery(p),
          },
        },
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
  mode?: MonitoringMode;
}) {
  return useQuery({
    queryKey: qk.partner.fleet.cell({
      platform: 'gojek',
      key: p.plate,
      day: p.day,
      month: p.month,
      year: p.year,
      mode: p.mode,
    }),
    queryFn: async (): Promise<CellBreakdown> => {
      const { data, error } = await api.GET('/partner/portal/fleet/gojek/cell', {
        params: {
          query: {
            plate: p.plate,
            day: p.day,
            month: p.month,
            year: p.year,
            ...(p.mode ? { mode: p.mode } : {}),
          },
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as CellBreakdown;
    },
    enabled: p.enabled,
  });
}

export function usePartnerGojekSummaryQuery(p: {
  month: number;
  year: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: qk.partner.fleet.summary({ platform: 'gojek', ...p }),
    queryFn: async (): Promise<GojekSummaryResponse> => {
      const { data, error } = await api.GET('/partner/portal/fleet/gojek/summary', {
        params: {
          query: {
            month: p.month,
            year: p.year,
            ...(p.dateFrom && p.dateTo ? { dateFrom: p.dateFrom, dateTo: p.dateTo } : {}),
          },
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as GojekSummaryResponse;
    },
    placeholderData: keepPreviousData,
  });
}
