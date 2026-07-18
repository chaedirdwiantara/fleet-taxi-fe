import { z } from 'zod';
import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';

// Typed, zod-validated search params for Rental Monitoring (same pattern as
// the fleet grids): the whole filter state lives in the URL — shareable,
// back-button friendly, and it keys the Query cache directly.
export const rentalSearchSchema = z.object({
  month: z
    .number()
    .int()
    .min(1)
    .max(12)
    .catch(() => currentMonthWIB()),
  year: z
    .number()
    .int()
    .min(2020)
    .max(2100)
    .catch(() => currentYearWIB()),
  region: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  sortBy: z.enum(['date', 'duration', 'status', 'omset', 'cogs']).catch('date'),
  sortOrder: z.enum(['asc', 'desc']).catch('asc'),
});

export type RentalSearch = z.infer<typeof rentalSearchSchema>;
