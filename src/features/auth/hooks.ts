import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk } from '@/lib/query-client';

// Two SEPARATE auth surfaces (brief §4 humans, split per audience):
//   - Admin console: /admin/auth/{login,logout,me}
//   - Partner portal: /partner/portal/{login,logout,me}
// Each login only ever yields its own audience; the opposite `me` returns 401,
// so an admin session cannot open partner pages and vice versa. The SPA holds
// no token — the HTTP-only cookie rides along via credentials:'include'.

export type SessionUser = {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
  partner: { id: number; code: string; name: string; type: string } | null;
  // true when the account must change its password before using the app
  // (set on admin-created accounts, cleared by /auth/change-password)
  mustChangePassword?: boolean;
};

export type Role = 'super_admin' | 'admin' | 'partner';

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

// ---- Admin console auth -------------------------------------------------------

export async function fetchAdminSession(): Promise<SessionUser | null> {
  const { data, error, response } = await api.GET('/admin/auth/me');
  if (response.status === 401) return null;
  if (error) throwEnvelope(error);
  return unwrap(data) as SessionUser;
}

export function useAdminSession() {
  return useQuery({
    queryKey: qk.adminSession,
    queryFn: fetchAdminSession,
    staleTime: 5 * 60_000,
  });
}

export function useAdminLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const { data, error } = await api.POST('/admin/auth/login', { body });
      if (error) throwEnvelope(error);
      return unwrap(data) as SessionUser;
    },
    onSuccess: (user) => qc.setQueryData(qk.adminSession, user),
  });
}

export function useAdminLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST('/admin/auth/logout');
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(qk.adminSession, null);
    },
  });
}

// ---- Partner portal auth ------------------------------------------------------

export async function fetchPartnerSession(): Promise<SessionUser | null> {
  const { data, error, response } = await api.GET('/partner/portal/me');
  if (response.status === 401) return null;
  if (error) throwEnvelope(error);
  return unwrap(data) as SessionUser;
}

export function usePartnerSession() {
  return useQuery({
    queryKey: qk.partnerSession,
    queryFn: fetchPartnerSession,
    staleTime: 5 * 60_000,
  });
}

export function usePartnerLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const { data, error } = await api.POST('/partner/portal/login', { body });
      if (error) throwEnvelope(error);
      return unwrap(data) as SessionUser;
    },
    onSuccess: (user) => qc.setQueryData(qk.partnerSession, user),
  });
}

export function usePartnerLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST('/partner/portal/logout');
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(qk.partnerSession, null);
    },
  });
}

// ---- First-login / self-service password change -------------------------------
// Shared surface for both audiences (POST /auth/change-password). On success the
// backend clears mustChangePassword and refreshes the session, so we invalidate
// both session queries — whichever one is active re-fetches and the gate lifts.

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { currentPassword: string; newPassword: string }) => {
      const { data, error } = await api.POST('/auth/change-password', { body });
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.adminSession });
      void qc.invalidateQueries({ queryKey: qk.partnerSession });
    },
  });
}
