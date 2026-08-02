import { z } from 'zod';
import { COP_SORT_FIELDS } from './types';

// Typed, zod-validated search params for the Car Ownership Program report.
// Same contract as the Cicilan page: the whole table state lives in the URL
// (shareable, back-button friendly) and keys the Query cache directly.
export const copSearchSchema = z.object({
  status: z
    .enum(['berjalan', 'lunas'])
    .optional()
    .catch(() => undefined),
  q: z
    .string()
    .optional()
    .catch(() => undefined),
  // default mirrors the backend: the biggest outstanding first
  sortBy: z.enum(COP_SORT_FIELDS).catch(() => 'remaining' as const),
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

export type CopSearch = z.infer<typeof copSearchSchema>;
