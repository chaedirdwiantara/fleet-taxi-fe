import { z } from 'zod';
import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';

// Search params for the Rental Monitoring pivot. Deliberately smaller than
// `rentalSearchSchema` (the ledger's filters and sorting mean nothing to a
// calendar): a period, and which cell is open. Same `.catch()` discipline as
// the fleet grids, so a hand-typed URL degrades to the current month instead of
// blowing up the route.
export const rentalGridSearchSchema = z.object({
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
  /** Open cell as `<plateNorm>:<day>` — parsed with the fleet grids' helpers. */
  cell: z.string().optional().catch(undefined),
});

export type RentalGridSearch = z.infer<typeof rentalGridSearchSchema>;
