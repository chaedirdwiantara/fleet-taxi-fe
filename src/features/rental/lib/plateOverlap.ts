import { ApiErrorException } from '@/lib/api-client/client';

/**
 * A plate may be rented more than once over the same dates — a car let out for
 * six hours can be let out again that day to another customer — so the backend
 * does not forbid an overlap. It refuses it ONCE, because the same overlap is
 * far more often a booking entered twice, which would silently double the
 * month's omset.
 *
 * That refusal is a CONFLICT carrying one `details` entry per clashing rental,
 * each marked with this field. Re-sending the write with `allowOverlap: true`
 * is the partner saying "yes, this is a separate booking".
 *
 * Mirrors OVERLAP_DETAIL_FIELD in BE `partner-rentals.service.ts`.
 */
const OVERLAP_DETAIL_FIELD = 'plateOverlap';

/**
 * The clashing rentals described by a failed rental write, or `null` when the
 * failure is anything else (validation, missing proof, a lost session) and so
 * belongs in the form's normal error line.
 */
export function plateOverlapClashes(error: unknown): string[] | null {
  if (!(error instanceof ApiErrorException) || error.code !== 'CONFLICT') return null;
  const clashes = (error.details ?? [])
    .filter((detail) => detail.field === OVERLAP_DETAIL_FIELD)
    .map((detail) => detail.message);
  return clashes.length > 0 ? clashes : null;
}
