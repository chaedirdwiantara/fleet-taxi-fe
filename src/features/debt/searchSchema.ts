import { z } from 'zod';
import { DEBT_SORT_FIELDS } from './types';

// Typed, zod-validated search params for the Debt Summary page. The whole
// table state (filters, sort, pagination) lives in the URL: shareable,
// back-button friendly, and it keys the Query cache directly.
export const debtSearchSchema = z.object({
  status: z
    .enum(['aktif', 'nonaktif'])
    .optional()
    .catch(() => undefined),
  cabang: z
    .string()
    .optional()
    .catch(() => undefined),
  koordinator: z
    .string()
    .optional()
    .catch(() => undefined),
  q: z
    .string()
    .optional()
    .catch(() => undefined),
  // default mirrors the backend: the least-covered drivers first
  sortBy: z.enum(DEBT_SORT_FIELDS).catch(() => 'selisihDeposit' as const),
  sortOrder: z.enum(['asc', 'desc']).catch(() => 'asc' as const),
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

export type DebtSearch = z.infer<typeof debtSearchSchema>;
