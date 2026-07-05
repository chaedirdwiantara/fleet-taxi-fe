import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { qk } from '@/lib/query-client';
import { ApiErrorException } from '@/lib/api-client/client';
import { setSessionUser } from '@/mocks/handlers';
import { partnerMe, adminMe } from '@/mocks/fixtures/partner';
import {
  fetchAdminSession,
  fetchPartnerSession,
  useAdminLogin,
  usePartnerLogin,
} from './hooks';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

describe('separate auth surfaces (admin console vs partner portal)', () => {
  it('admin me resolves only for an admin session; partner me returns null for it', async () => {
    setSessionUser(adminMe);
    await expect(fetchAdminSession()).resolves.toMatchObject({ roles: ['admin'] });
    // an admin session is NOT a partner session
    await expect(fetchPartnerSession()).resolves.toBeNull();
  });

  it('partner me resolves only for a partner session; admin me returns null for it', async () => {
    setSessionUser(partnerMe);
    await expect(fetchPartnerSession()).resolves.toMatchObject({ roles: ['partner'] });
    await expect(fetchAdminSession()).resolves.toBeNull();
  });

  it('both return null when unauthenticated', async () => {
    setSessionUser(null);
    await expect(fetchAdminSession()).resolves.toBeNull();
    await expect(fetchPartnerSession()).resolves.toBeNull();
  });
});

describe('useAdminLogin', () => {
  it('primes the admin session cache and makes admin me resolve', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminLogin(), { wrapper: wrapperFor(client) });

    result.current.mutate({ email: 'admin@fleet-taxi.id', password: 'secret' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData(qk.adminSession)).toMatchObject({ roles: ['admin'] });
    await expect(fetchAdminSession()).resolves.toMatchObject({ roles: ['admin'] });
    // partner surface stays anonymous
    await expect(fetchPartnerSession()).resolves.toBeNull();
  });

  it('surfaces the error envelope as ApiErrorException on bad credentials', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminLogin(), { wrapper: wrapperFor(client) });

    result.current.mutate({ email: 'admin@fleet-taxi.id', password: 'wrong' });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiErrorException);
    expect((result.current.error as ApiErrorException).code).toBe('INVALID_CREDENTIALS');
  });
});

describe('usePartnerLogin', () => {
  it('primes the partner session cache and keeps the admin surface anonymous', async () => {
    const client = makeClient();
    const { result } = renderHook(() => usePartnerLogin(), { wrapper: wrapperFor(client) });

    result.current.mutate({ email: 'ops@bhisa.id', password: 'secret' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData(qk.partnerSession)).toMatchObject({ roles: ['partner'] });
    await expect(fetchAdminSession()).resolves.toBeNull();
  });
});
