import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { env } from '@/lib/env';

// Cookie-session auth: every request carries the HTTP-only session cookie
// (cross-subdomain in prod, same-origin via the Vite proxy in dev).
// The SPA never holds a token in JS.
export const api = createClient<paths>({
  baseUrl: env.VITE_API_BASE_URL,
  credentials: 'include',
  // lazy lookup instead of the default fetch captured at createClient time,
  // so MSW's patched fetch (applied in server.listen()) is picked up in tests
  fetch: (input) => globalThis.fetch(input),
});

// ---- Universal envelope (PROJECT-BRIEF.md §6) --------------------------------

export type Meta = { page: number; pageSize: number; total: number };

export type ApiErrorDetail = { field: string; message: string };
export type ApiError = { code: string; message: string; details?: ApiErrorDetail[] };

export type Envelope<T> =
  | { success: true; data: T; meta?: Meta }
  | { success: false; error: ApiError };

export class ApiErrorException extends Error {
  readonly code: string;
  readonly details?: ApiErrorDetail[];

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiErrorException';
    this.code = error.code;
    this.details = error.details;
  }
}

/** Unwrap the standard envelope: return `data` or throw an ApiErrorException. */
export function unwrap<T>(res: Envelope<T> | undefined): T {
  if (!res) {
    throw new ApiErrorException({ code: 'EMPTY_RESPONSE', message: 'Empty response body' });
  }
  if (res.success) return res.data;
  throw new ApiErrorException(res.error);
}

/** Like unwrap, but keeps pagination meta for list endpoints. */
export function unwrapWithMeta<T>(res: Envelope<T> | undefined): { data: T; meta?: Meta } {
  if (!res) {
    throw new ApiErrorException({ code: 'EMPTY_RESPONSE', message: 'Empty response body' });
  }
  if (res.success) return { data: res.data, meta: res.meta };
  throw new ApiErrorException(res.error);
}
