import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { compressImage } from '@/features/partner/checkpoint/compressImage';
import { resolveMediaUrl } from '@/features/partner/checkpoint/hooks';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { env } from '@/lib/env';
import { qk } from '@/lib/query-client';
import type {
  CogsDefault,
  PaymentStatus,
  RentalItem,
  RentalListData,
  RentalListParams,
  RentalPaymentProof,
  RentalUpsertInput,
} from './types';

export { resolveMediaUrl };

/** Presign response for one payment proof (mirrors the driver-document shape). */
interface PresignProofResult {
  proofId: number;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}

// Rental Monitoring — CRUD over the partner's own rental transactions plus
// the per-vehicle-type COGS presets. Scoping is server-side (session
// partner); all derived amounts come from the BE. Any mutation invalidates
// the whole ['partner','rental'] namespace (list + presets).

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

const RENTAL_NS = ['partner', 'rental'] as const;

export function useRentalsQuery(params: RentalListParams) {
  return useQuery({
    queryKey: qk.partner.rental.list(params),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<RentalListData> => {
      const { data, error } = await api.GET('/partner/portal/rentals', {
        params: { query: params },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as RentalListData;
    },
  });
}

export function useCreateRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RentalUpsertInput): Promise<RentalItem> => {
      const { data, error } = await api.POST('/partner/portal/rentals', { body });
      if (error) throwEnvelope(error);
      return unwrap(data) as RentalItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RENTAL_NS }),
  });
}

export function useUpdateRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; body: RentalUpsertInput }): Promise<RentalItem> => {
      const { data, error } = await api.PUT('/partner/portal/rentals/{id}', {
        params: { path: { id: input.id } },
        body: input.body,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as RentalItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RENTAL_NS }),
  });
}

export function useDeleteRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await api.DELETE('/partner/portal/rentals/{id}', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RENTAL_NS }),
  });
}

export function useUpdatePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      paymentStatus: PaymentStatus;
      paymentProofIds?: number[];
    }): Promise<RentalItem> => {
      const { data, error } = await api.PATCH('/partner/portal/rentals/{id}/payment-status', {
        params: { path: { id: input.id } },
        body: {
          paymentStatus: input.paymentStatus,
          ...(input.paymentProofIds?.length ? { paymentProofIds: input.paymentProofIds } : {}),
        },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as RentalItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RENTAL_NS }),
  });
}

// ---- payment evidence (presign → PUT → confirm) --------------------------------
// Same orchestration as driver documents / checkpoint media. A proof is
// uploaded on its own and only becomes part of a rental when its id is sent
// with the create/update/payment-status call — which is what lets the add
// form collect evidence before the rental row exists.

/** Mirrors the file-input `accept` list — anything else is rejected before presign. */
export const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/** Matches RENTAL_MAX_PROOFS on the backend, which is the real enforcement. */
export const MAX_PROOFS = 5;

export function useUploadRentalProof() {
  return useMutation({
    mutationFn: async (file: File): Promise<RentalPaymentProof> => {
      if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
        throw new ApiErrorException({
          code: 'VALIDATION_ERROR',
          message: 'Format file tidak didukung (JPG, PNG, atau PDF).',
        });
      }
      const isImage = file.type.startsWith('image/');
      // compressImage re-encodes both image kinds to JPEG; PDFs go as-is.
      const blob = isImage ? await compressImage(file) : file;
      const contentType = isImage ? 'image/jpeg' : 'application/pdf';

      const { data: presignData, error: presignError } = await api.POST(
        '/partner/portal/rentals/proofs/presign',
        { body: { contentType, sizeBytes: blob.size, fileName: file.name } },
      );
      if (presignError) throwEnvelope(presignError);
      const presign = unwrap(presignData) as PresignProofResult;

      // Plain fetch: S3 presigned URLs live outside the typed client. The
      // cookie is only needed by the dev sink and is ignored by S3.
      const putRes = await fetch(resolveMediaUrl(presign.uploadUrl), {
        method: presign.method,
        headers: presign.headers,
        body: blob,
        credentials: presign.uploadUrl.startsWith('/') ? 'include' : 'omit',
      });
      if (!putRes.ok) {
        throw new ApiErrorException({
          code: 'UPLOAD_FAILED',
          message: `Unggah gagal (${putRes.status}) — periksa koneksi lalu coba lagi`,
        });
      }

      const { data: confirmData, error: confirmError } = await api.POST(
        '/partner/portal/rentals/proofs/{proofId}/confirm',
        { params: { path: { proofId: presign.proofId } } },
      );
      if (confirmError) throwEnvelope(confirmError);
      return unwrap(confirmData) as RentalPaymentProof;
    },
  });
}

/**
 * Deletes one proof. The BE refuses to remove the last evidence of a rental
 * that is still marked paid, so the error message is worth surfacing.
 */
export function useDeleteRentalProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proofId: number) => {
      const { data, error } = await api.DELETE('/partner/portal/rentals/proofs/{proofId}', {
        params: { path: { proofId } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RENTAL_NS }),
  });
}

export function useCogsDefaultsQuery() {
  return useQuery({
    queryKey: qk.partner.rental.cogsDefaults,
    queryFn: async (): Promise<CogsDefault[]> => {
      const { data, error } = await api.GET('/partner/portal/rentals/cogs-defaults');
      if (error) throwEnvelope(error);
      return (unwrap(data) as { items: CogsDefault[] }).items;
    },
  });
}

/** PUT with `key` updates a preset; without `key` creates a new one. */
export function useUpsertCogsDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      key?: string;
      label: string;
      cogsPerDay: number;
    }): Promise<CogsDefault> => {
      const { data, error } = await api.PUT('/partner/portal/rentals/cogs-defaults', { body });
      if (error) throwEnvelope(error);
      return unwrap(data) as CogsDefault;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RENTAL_NS }),
  });
}

// ---- Excel export ------------------------------------------------------------
// Binary download — NOT via the typed client: we need the raw Response to
// read the blob + Content-Disposition filename. Cookie session rides along
// with credentials:'include' (same as the api client).

export async function downloadRentalExport(params: RentalListParams): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('month', String(params.month));
  qs.set('year', String(params.year));
  if (params.region) qs.set('region', params.region);
  if (params.search) qs.set('search', params.search);
  qs.set('sortBy', params.sortBy);
  qs.set('sortOrder', params.sortOrder);

  const res = await fetch(`${env.VITE_API_BASE_URL}/partner/portal/rentals/export?${qs}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new ApiErrorException({
      code: 'EXPORT_FAILED',
      message: `Export gagal (HTTP ${res.status})`,
    });
  }

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename =
    match?.[1] ?? `rental-monitoring-${params.year}-${String(params.month).padStart(2, '0')}.xlsx`;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
