import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';
import type { AdminUser, ApiKeyCreated, Partner, StaffRole } from './types';

// super_admin-only user management: create + list admin/staff accounts and
// partner-portal accounts, create partners, and mint external API keys.
// Backend enforces the super_admin policy (CASL); these hooks just wire the UI.

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export function useAdminUsersQuery(type: 'admin' | 'partner') {
  return useQuery({
    queryKey: qk.admin.users(type),
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await api.GET('/admin/users', { params: { query: { type } } });
      if (error) throwEnvelope(error);
      return unwrap(data) as AdminUser[];
    },
  });
}

export function usePartnersQuery() {
  return useQuery({
    queryKey: qk.admin.partners,
    queryFn: async (): Promise<Partner[]> => {
      const { data, error } = await api.GET('/admin/partners');
      if (error) throwEnvelope(error);
      return unwrap(data) as Partner[];
    },
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      email: string;
      fullName: string;
      password: string;
      roles: StaffRole[];
    }): Promise<AdminUser> => {
      const { data, error } = await api.POST('/admin/users', { body });
      if (error) throwEnvelope(error);
      return unwrap(data) as AdminUser;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.users('admin') }),
  });
}

export function useCreatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { code: string; name: string; type?: string }): Promise<Partner> => {
      const { data, error } = await api.POST('/admin/partners', { body });
      if (error) throwEnvelope(error);
      return unwrap(data) as Partner;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.partners }),
  });
}

export function useCreatePartnerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      partnerId: number;
      email: string;
      fullName: string;
      password: string;
    }): Promise<AdminUser> => {
      const { partnerId, ...body } = input;
      const { data, error } = await api.POST('/admin/partners/{id}/users', {
        params: { path: { id: partnerId } },
        body,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as AdminUser;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.users('partner') }),
  });
}

export function useCreateApiKey() {
  return useMutation({
    mutationFn: async (input: {
      partnerId: number;
      label?: string;
      scopes?: string[];
      rateLimit?: number;
    }): Promise<ApiKeyCreated> => {
      const { partnerId, ...body } = input;
      const { data, error } = await api.POST('/admin/partners/{id}/api-keys', {
        params: { path: { id: partnerId } },
        body,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as ApiKeyCreated;
    },
  });
}
