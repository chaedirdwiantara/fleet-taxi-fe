import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  unwrap,
  unwrapWithMeta,
  ApiErrorException,
  type ApiError,
  type Meta,
} from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import type {
  CopListParams,
  CopRow,
  CopSummary,
  DriverOption,
  InstallmentListParams,
  InstallmentRecap,
  InstallmentRule,
  InstallmentUpsertInput,
} from './types';

// Cicilan — CRUD over the partner's own installment rules plus the
// derived payment history (Rekap). Scoping is server-side (session partner);
// all derived amounts come from the BE. Any mutation invalidates the whole
// ['partner','cicilan'] namespace (list + recap + driver options).

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

const CICILAN_NS = qk.partner.cicilan.all;

export function useInstallmentListQuery(params: InstallmentListParams) {
  return useQuery({
    queryKey: qk.partner.cicilan.list(params),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<{ data: InstallmentRule[]; meta?: Meta }> => {
      const { data, error } = await api.GET('/partner/portal/deposit-installments', {
        params: {
          query: {
            status: params.status,
            search: params.search || undefined,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
            page: String(params.page),
            pageSize: String(params.pageSize),
          },
        },
      });
      if (error) throwEnvelope(error);
      const { data: rows, meta } = unwrapWithMeta(data);
      return { data: rows as InstallmentRule[], meta };
    },
  });
}

// Car Ownership Program — read-only report over the COP-titled subset. The
// list is paginated; the summary is deliberately a second endpoint because it
// covers EVERY matching row, not the page on screen.

export function useCopListQuery(params: CopListParams) {
  return useQuery({
    queryKey: qk.partner.cicilan.cop.list(params),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<{ data: CopRow[]; meta?: Meta }> => {
      const { data, error } = await api.GET('/partner/portal/deposit-installments/cop', {
        params: {
          query: {
            status: params.status,
            search: params.search || undefined,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
            page: String(params.page),
            pageSize: String(params.pageSize),
          },
        },
      });
      if (error) throwEnvelope(error);
      const { data: rows, meta } = unwrapWithMeta(data);
      return { data: rows as CopRow[], meta };
    },
  });
}

export function useCopSummaryQuery(params: Pick<CopListParams, 'status' | 'search'>) {
  return useQuery({
    queryKey: qk.partner.cicilan.cop.summary(params),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<CopSummary> => {
      const { data, error } = await api.GET('/partner/portal/deposit-installments/cop/summary', {
        params: { query: { status: params.status, search: params.search || undefined } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as CopSummary;
    },
  });
}

export function useDriverOptionsQuery(enabled = true) {
  return useQuery({
    queryKey: qk.partner.cicilan.driverOptions,
    enabled,
    queryFn: async (): Promise<DriverOption[]> => {
      const { data, error } = await api.GET('/partner/portal/deposit-installments/driver-options');
      if (error) throwEnvelope(error);
      return unwrap(data) as DriverOption[];
    },
  });
}

export function useRecapQuery(id: number | null) {
  return useQuery({
    queryKey: qk.partner.cicilan.recap(id ?? 0),
    enabled: id != null,
    queryFn: async (): Promise<InstallmentRecap> => {
      const { data, error } = await api.GET('/partner/portal/deposit-installments/{id}/recap', {
        params: { path: { id: id! } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as InstallmentRecap;
    },
  });
}

export function useCreateInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InstallmentUpsertInput): Promise<InstallmentRule> => {
      const { data, error } = await api.POST('/partner/portal/deposit-installments', {
        body: input,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as InstallmentRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CICILAN_NS }),
  });
}

export function useUpdateInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: number;
      input: InstallmentUpsertInput;
    }): Promise<InstallmentRule> => {
      const { data, error } = await api.PUT('/partner/portal/deposit-installments/{id}', {
        params: { path: { id: vars.id } },
        body: vars.input,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as InstallmentRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CICILAN_NS }),
  });
}

export function useDeleteInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const { error } = await api.DELETE('/partner/portal/deposit-installments/{id}', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CICILAN_NS }),
  });
}
