import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

// One plate-registration screen serves two audiences: the partner portal
// ("Daftarkan Plat", its own plates) and the admin console ("Plate
// Registration", the console's own registry). Same CRUD — what differs is the
// endpoint behind the controller and the admin-only partner field.

/** A registered plate as either registry returns it. */
export type PlateRow = {
  id: number;
  plateNumber: string; // as entered, e.g. "B 1793 SCP"
  plateNumberNorm: string; // normalized [A-Z0-9]
  vehicleType: string | null; // "Type", free text (e.g. "Premium - BYD M6")
  /** Admin registry only: the partner name the admin typed in. */
  partnerName?: string | null;
  /**
   * Admin registry only: the active partner that registered the same plate in
   * its own portal, `null` when nobody claimed it. Server-derived on every read
   * — shown only as a fallback where `partnerName` is empty.
   */
  registeredPartnerName?: string | null;
};

export type PlateInput = { plateNumber: string; vehicleType?: string; partnerName?: string };

/**
 * The data side of the screen, injected by the audience's page. Keeps
 * PlateRegistry presentational: it never picks an endpoint or a query key.
 */
export type PlateRegistryController<TRow extends PlateRow = PlateRow> = {
  list: UseQueryResult<TRow[], Error>;
  register: UseMutationResult<TRow, Error, PlateInput>;
  update: UseMutationResult<TRow, Error, PlateInput & { id: number }>;
  remove: UseMutationResult<unknown, Error, number>;
};
