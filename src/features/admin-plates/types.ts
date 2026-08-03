import type { PlateRow } from '@/features/plate-registry/types';

/**
 * Admin console registry ("Plate Registration"): the same nomor + Type a partner
 * registers, plus the partner that registered the SAME plate in its own portal
 * (`null` when nobody did). The admin registry is invisible to partners — it
 * only widens what the admin monitoring shows.
 */
export type AdminPlate = PlateRow & { partnerName: string | null };
