import { QueryClient } from '@tanstack/react-query';
import { ApiErrorException } from '@/lib/api-client/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Never retry auth/validation errors; retry network blips up to 2x.
        if (error instanceof ApiErrorException) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export { qk } from './qk';
export type { Platform } from './qk';
