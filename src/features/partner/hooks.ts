import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import {
  api,
  unwrap,
  unwrapWithMeta,
  ApiErrorException,
  type ApiError,
} from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import type { ExportFormat, Order, PartnerDashboard } from './types';

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export function useDashboardQuery() {
  return useQuery({
    queryKey: qk.partner.dashboard,
    queryFn: async (): Promise<PartnerDashboard> => {
      const { data, error } = await api.GET('/partner/portal/dashboard');
      if (error) throwEnvelope(error);
      return unwrap(data) as PartnerDashboard;
    },
  });
}

export function useOrdersQuery(p: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: qk.partner.orders(p),
    queryFn: async () => {
      const { data, error } = await api.GET('/partner/portal/orders', {
        params: { query: p },
      });
      if (error) throwEnvelope(error);
      return unwrapWithMeta(data) as { data: Order[]; meta?: { page: number; pageSize: number; total: number } };
    },
    placeholderData: keepPreviousData,
  });
}

export function useOrderQuery(id: string) {
  return useQuery({
    queryKey: qk.partner.order(id),
    queryFn: async (): Promise<Order> => {
      const { data, error } = await api.GET('/partner/portal/orders/{id}', {
        params: { path: { id: Number(id) } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as Order;
    },
  });
}

/** Server-generated export (§6.2) — the client only downloads the blob. */
export function useExportOrders() {
  return useMutation({
    mutationFn: async (format: ExportFormat) => {
      const { data, error, response } = await api.GET('/partner/portal/orders/export', {
        params: { query: { format } },
        parseAs: 'blob',
      });
      if (error) throwEnvelope(error);
      const blob = data as Blob;
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `orders.${format}`;
      return { blob, filename };
    },
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
