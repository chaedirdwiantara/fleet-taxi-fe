import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import { gridFilterQuery } from '@/features/fleet/hooks/useFleetQueries';
import type { MonitoringMode } from '@/features/fleet/searchSchema';
import type { GrabDriverDetail, GrabGrid, GrabSummary } from './types';

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export function useGrabGridQuery(p: {
  month: number;
  year: number;
  rentalPartner: string[];
  q?: string;
  vehicleType?: string[];
  mode?: MonitoringMode;
}) {
  return useQuery({
    queryKey: qk.fleet.grid({
      platform: 'grab',
      month: p.month,
      year: p.year,
      rentalPartner: p.rentalPartner,
      q: p.q,
      vehicleType: p.vehicleType,
      mode: p.mode,
    }),
    queryFn: async (): Promise<GrabGrid> => {
      const { data, error } = await api.GET('/admin/fleet/grab/grid', {
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
      return unwrap(data) as GrabGrid;
    },
    placeholderData: keepPreviousData,
  });
}

export function useGrabDriverDetailQuery(p: {
  compositeKey: string;
  month: number;
  year: number;
  enabled: boolean;
  mode?: MonitoringMode;
}) {
  return useQuery({
    queryKey: qk.fleet.cell({
      platform: 'grab',
      key: p.compositeKey,
      day: 1,
      month: p.month,
      year: p.year,
      mode: p.mode,
    }),
    queryFn: async (): Promise<GrabDriverDetail> => {
      const { data, error } = await api.GET('/admin/fleet/grab/cell', {
        params: {
          query: {
            compositeKey: p.compositeKey,
            day: 1,
            month: p.month,
            year: p.year,
            ...(p.mode ? { mode: p.mode } : {}),
          },
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as GrabDriverDetail;
    },
    enabled: p.enabled,
  });
}

// ---- Partner portal variants (read-only, scoped server-side to own plates) ----

export function usePartnerGrabGridQuery(p: {
  month: number;
  year: number;
  mode?: MonitoringMode;
  q?: string;
  vehicleType?: string[];
}) {
  return useQuery({
    queryKey: qk.partner.fleet.grid({ platform: 'grab', ...p }),
    queryFn: async (): Promise<GrabGrid> => {
      const { data, error } = await api.GET('/partner/portal/fleet/grab/grid', {
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
      return unwrap(data) as GrabGrid;
    },
    placeholderData: keepPreviousData,
  });
}

export function usePartnerGrabDriverDetailQuery(p: {
  compositeKey: string;
  month: number;
  year: number;
  enabled: boolean;
  mode?: MonitoringMode;
}) {
  return useQuery({
    queryKey: qk.partner.fleet.cell({
      platform: 'grab',
      key: p.compositeKey,
      day: 1,
      month: p.month,
      year: p.year,
      mode: p.mode,
    }),
    queryFn: async (): Promise<GrabDriverDetail> => {
      const { data, error } = await api.GET('/partner/portal/fleet/grab/cell', {
        params: {
          query: {
            compositeKey: p.compositeKey,
            day: 1,
            month: p.month,
            year: p.year,
            ...(p.mode ? { mode: p.mode } : {}),
          },
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as GrabDriverDetail;
    },
    enabled: p.enabled,
  });
}

export function useGrabSummaryQuery(p: {
  month: number;
  year: number;
  dateFrom?: string;
  dateTo?: string;
  rentalPartner?: string;
}) {
  return useQuery({
    queryKey: qk.fleet.summary({ platform: 'grab', ...p }),
    queryFn: async (): Promise<GrabSummary> => {
      const { data, error } = await api.GET('/admin/fleet/grab/summary', {
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
      return unwrap(data) as GrabSummary;
    },
    placeholderData: keepPreviousData,
  });
}

/** Partner twin of useGrabSummaryQuery — server-scoped to the own plates. */
export function usePartnerGrabSummaryQuery(p: {
  month: number;
  year: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: qk.partner.fleet.summary({ platform: 'grab', ...p }),
    queryFn: async (): Promise<GrabSummary> => {
      const { data, error } = await api.GET('/partner/portal/fleet/grab/summary', {
        params: {
          query: {
            month: p.month,
            year: p.year,
            ...(p.dateFrom && p.dateTo ? { dateFrom: p.dateFrom, dateTo: p.dateTo } : {}),
          },
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as GrabSummary;
    },
    placeholderData: keepPreviousData,
  });
}
