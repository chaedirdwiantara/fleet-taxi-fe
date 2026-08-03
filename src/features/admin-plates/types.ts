import type { PlateRow } from '@/features/plate-registry/types';

/**
 * Admin console registry ("Plate Registration"): nomor + Type as a partner
 * registers them, plus a free-text partner label the admin types in
 * (`partnerName`) and — separately, resolved by the server on every read — the
 * partner that registered the SAME plate in its own portal
 * (`registeredPartnerName`, `null` when nobody did). The admin registry is
 * invisible to partners; it only widens what the admin monitoring shows.
 */
export type AdminPlate = PlateRow & {
  partnerName: string | null;
  registeredPartnerName: string | null;
};
