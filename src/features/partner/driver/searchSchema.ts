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

/**
 * Driver Resign page. `resigned` is pinned to 'true' by the route (the page IS
 * the resign list), so only the narrowing lives in the URL: `resignedType`
 * splits manually marked resignations from the ones detected in the import.
 */
export const resignedDriverSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  plate: z.string().optional().catch(undefined),
  resignedType: z.enum(['manual', 'auto']).optional().catch(undefined),
  page: z.number().int().min(1).catch(1),
});
export type ResignedDriverSearch = z.infer<typeof resignedDriverSearchSchema>;
