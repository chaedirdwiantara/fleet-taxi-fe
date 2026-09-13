import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  unwrap,
  unwrapWithMeta,
  ApiErrorException,
  type ApiError,
} from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import type {
  GojekPortalSyncRun,
  GojekPortalSyncSettings,
  GojekPortalSyncSettingsInput,
  GojekPortalSyncStatus,
} from './types';

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export const RUNS_PAGE_SIZE = 20;
/** Poll cadence while a run is in flight (the portal phase has no socket events). */
export const RUN_POLL_MS = 2_000;

export function useGojekPortalSettingsQuery() {
  return useQuery({
    queryKey: qk.admin.gojekPortalSync.settings,
    queryFn: async (): Promise<GojekPortalSyncSettings> => {
      const { data, error } = await api.GET('/admin/gojek-portal-sync/settings');
      if (error) throwEnvelope(error);
      return unwrap(data) as GojekPortalSyncSettings;
    },
  });
}

export function useGojekPortalStatusQuery() {
  return useQuery({
    queryKey: qk.admin.gojekPortalSync.status,
    queryFn: async (): Promise<GojekPortalSyncStatus> => {
      const { data, error } = await api.GET('/admin/gojek-portal-sync/status');
      if (error) throwEnvelope(error);
      return unwrap(data) as GojekPortalSyncStatus;
    },
    // keep the "Proses terakhir" card live while the scheduler/worker is busy
    refetchInterval: (query) => (query.state.data?.runningRun ? RUN_POLL_MS : false),
  });
}

export function useGojekPortalRunsQuery(page: number) {
  return useQuery({
    queryKey: qk.admin.gojekPortalSync.runs({ page }),
    queryFn: async () => {
      const { data, error } = await api.GET('/admin/gojek-portal-sync/runs', {
        params: { query: { page, pageSize: RUNS_PAGE_SIZE } },
      });
      if (error) throwEnvelope(error);
      return unwrapWithMeta(data) as {
        data: GojekPortalSyncRun[];
        meta?: { page: number; pageSize: number; total: number };
      };
    },
    placeholderData: keepPreviousData,
  });
}

/** One run, polled until it leaves `running` (progress fallback = polling). */
export function useGojekPortalRunQuery(runId: number | null) {
  return useQuery({
    queryKey: qk.admin.gojekPortalSync.run(runId ?? 0),
    queryFn: async (): Promise<GojekPortalSyncRun> => {
      const { data, error } = await api.GET('/admin/gojek-portal-sync/runs/{id}', {
        params: { path: { id: runId! } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as GojekPortalSyncRun;
    },
    enabled: runId !== null,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? RUN_POLL_MS : false),
    refetchIntervalInBackground: true,
  });
}

export function useSaveGojekPortalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GojekPortalSyncSettingsInput) => {
      const { data, error } = await api.PUT('/admin/gojek-portal-sync/settings', {
        body: {
          email: input.email,
          ...(input.password ? { password: input.password } : {}),
          isEnabled: input.isEnabled,
          runAt: input.runAt,
          lookbackDays: input.lookbackDays,
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as GojekPortalSyncSettings;
    },
    onSuccess: (settings) => {
      qc.setQueryData(qk.admin.gojekPortalSync.settings, settings);
      qc.invalidateQueries({ queryKey: qk.admin.gojekPortalSync.status });
    },
  });
}

export function useTestGojekPortalConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email?: string; password?: string }) => {
      const { data, error } = await api.POST('/admin/gojek-portal-sync/test-connection', {
        body: {
          ...(input.email ? { email: input.email } : {}),
          ...(input.password ? { password: input.password } : {}),
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as { email: string; verifiedAt: string | null };
    },
    onSuccess: (result) => {
      // a verified stored account updates lastVerifiedAt on both surfaces
      if (result.verifiedAt) {
        qc.invalidateQueries({ queryKey: qk.admin.gojekPortalSync.settings });
        qc.invalidateQueries({ queryKey: qk.admin.gojekPortalSync.status });
      }
    },
  });
}

export function useRunGojekPortalSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { dateFrom?: string; dateTo?: string }) => {
      const { data, error } = await api.POST('/admin/gojek-portal-sync/runs', {
        body: {
          ...(input.dateFrom ? { dateFrom: input.dateFrom } : {}),
          ...(input.dateTo ? { dateTo: input.dateTo } : {}),
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as GojekPortalSyncRun;
    },
    onSuccess: (run) => {
      qc.setQueryData(qk.admin.gojekPortalSync.run(run.id), run);
      qc.invalidateQueries({ queryKey: qk.admin.gojekPortalSync.status });
      qc.invalidateQueries({ queryKey: qk.admin.gojekPortalSync.all });
    },
  });
}

/** Everything a finished run may have changed: history, status, Gojek batches + grid. */
export function useInvalidateAfterRun() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.admin.gojekPortalSync.all });
    qc.invalidateQueries({ queryKey: qk.fleet.imports('gojek') });
    qc.invalidateQueries({ queryKey: ['fleet', 'gojek', 'grid'] });
    qc.invalidateQueries({ queryKey: ['fleet', 'gojek', 'summary'] });
  };
}
