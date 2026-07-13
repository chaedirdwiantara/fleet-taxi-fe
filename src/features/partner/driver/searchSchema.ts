import { z } from 'zod';

// Typed, zod-validated URL search params for the drivers list (same pattern
// as rental-monitoring): shareable, back-button friendly, and the params key
// the Query cache directly.

export const driverSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  plate: z.string().optional().catch(undefined),
  active: z.enum(['true', 'false']).optional().catch(undefined),
  resigned: z.enum(['true', 'false']).optional().catch(undefined),
  page: z.number().int().min(1).catch(1),
});
export type DriverSearch = z.infer<typeof driverSearchSchema>;
