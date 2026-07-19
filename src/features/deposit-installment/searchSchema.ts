import { z } from 'zod';
import { INSTALLMENT_SORT_FIELDS } from './types';

// Typed, zod-validated search params for the Cicilan Deposit page. The whole
// table state (filter, sort, pagination) lives in the URL: shareable,
// back-button friendly, and it keys the Query cache directly.
export const cicilanSearchSchema = z.object({
  status: z
    .enum(['berjalan', 'lunas'])
    .optional()
    .catch(() => undefined),
  q: z
    .string()
    .optional()
    .catch(() => undefined),
  // default mirrors the backend: newest rules first
  sortBy: z.enum(INSTALLMENT_SORT_FIELDS).catch(() => 'createdAt' as const),
  sortOrder: z.enum(['asc', 'desc']).catch(() => 'desc' as const),
  page: z
    .number()
    .int()
    .min(1)
    .catch(() => 1),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(200)
    .catch(() => 10),
});

export type CicilanSearch = z.infer<typeof cicilanSearchSchema>;
