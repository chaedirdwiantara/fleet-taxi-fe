import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, unwrapWithMeta, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import type { ActivityLog, ActivityLogFilters } from './types';

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export const LOGS_PAGE_SIZE = 50;

export function useActivityLogsQuery(p: ActivityLogFilters & { page: number }) {
  return useQuery({
    queryKey: qk.admin.activityLogs(p),
    queryFn: async () => {
      const { data, error } = await api.GET('/admin/activity-logs', {
        params: {
          query: {
            page: String(p.page),
            pageSize: String(LOGS_PAGE_SIZE),
            ...(p.audience ? { audience: p.audience } : {}),
            ...(p.actor ? { actor: p.actor } : {}),
            ...(p.action ? { action: p.action } : {}),
            ...(p.dateFrom ? { dateFrom: p.dateFrom } : {}),
            ...(p.dateTo ? { dateTo: p.dateTo } : {}),
            ...(p.search ? { search: p.search } : {}),
          },
        },
      });
      if (error) throwEnvelope(error);
      return unwrapWithMeta(data) as {
        data: ActivityLog[];
        meta?: { page: number; pageSize: number; total: number };
      };
    },
    placeholderData: keepPreviousData,
  });
}
