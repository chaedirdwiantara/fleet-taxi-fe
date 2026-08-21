import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  unwrap,
  unwrapWithMeta,
  ApiErrorException,
  type ApiError,
} from '@/lib/api-client/client';
import { compressImage } from '@/features/partner/checkpoint/compressImage';
import { resolveMediaUrl } from '@/features/partner/checkpoint/hooks';
import { qk } from '@/lib/query-client';
import type {
  DriverCreateInput,
  DriverDetail,
  DriverDocument,
  DriverDocumentKind,
  DriverSummary,
  DriverUpdateInput,
  PresignDocumentResult,
  ResignedType,
} from './types';

// Driver management — the roster auto-syncs from Fleet Monitoring
// (Gojek/Grab) server-side on every GET /drivers; the FE lists, registers
// drivers the import does not know (POST), edits, and drives the resign /
// deposit-return lifecycle via PATCH. Every mutation invalidates the whole
// ['partner','driver'] namespace.

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

const DRIVER_NS = qk.partner.driver.all;

export { resolveMediaUrl };

// ---- roster ------------------------------------------------------------------

export interface DriverListParams {
  q?: string;
  plate?: string;
  active?: string;
  /** 'true' = out of the fleet (manual resign OR detected exit). */
  resigned?: string;
  resignedType?: ResignedType;
  page: number;
}

export function useDriversQuery(params: DriverListParams) {
  return useQuery({
    queryKey: qk.partner.driver.drivers(params),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const flag = (v?: string) =>
        v === 'true' || v === 'false' ? (v as 'true' | 'false') : undefined;
      const { data, error } = await api.GET('/partner/portal/drivers', {
        params: {
          query: {
            page: String(params.page),
            ...(params.q && { q: params.q }),
            ...(params.plate && { plate: params.plate }),
            ...(flag(params.active) && { active: flag(params.active) }),
            ...(flag(params.resigned) && { resigned: flag(params.resigned) }),
            ...(params.resignedType && { resignedType: params.resignedType }),
          },
        },
      });
      if (error) throwEnvelope(error);
      const { data: rows, meta } = unwrapWithMeta(data);
      return { rows: rows as DriverSummary[], meta };
    },
  });
}

/** Page size of a picker slice — searching happens server-side, so this is a cap, not a window. */
const PICKER_PAGE_SIZE = 50;

/**
 * Roster slice for a name picker (e.g. the checkpoint handover parties).
 * The search runs server-side so partners with a large roster stay reachable;
 * results are cached per term and kept while the next term loads.
 */
export function useDriverPickerQuery(q: string, enabled = true) {
  const term = q.trim();
  return useQuery({
    queryKey: qk.partner.driver.picker(term),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await api.GET('/partner/portal/drivers', {
        params: {
          query: { page: '1', pageSize: String(PICKER_PAGE_SIZE), ...(term && { q: term }) },
        },
      });
      if (error) throwEnvelope(error);
      const { data: rows, meta } = unwrapWithMeta(data);
      return { rows: rows as DriverSummary[], total: meta?.total ?? 0 };
    },
  });
}

export function useDriverQuery(id: number) {
  return useQuery({
    queryKey: qk.partner.driver.detail(id),
    queryFn: async (): Promise<DriverDetail> => {
      const { data, error } = await api.GET('/partner/portal/drivers/{id}', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as DriverDetail;
    },
  });
}

/**
 * Manual registration — for drivers the Gojek/Grab import does not (yet) carry.
 * The row lands with `source: 'manual'` and is otherwise a normal roster row,
 * so the caller can send the user straight to its edit page.
 */
export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: DriverCreateInput): Promise<DriverDetail> => {
      const { data, error } = await api.POST('/partner/portal/drivers', { body });
      if (error) throwEnvelope(error);
      return unwrap(data) as DriverDetail;
    },
    onSuccess: (detail) => {
      qc.setQueryData(qk.partner.driver.detail(detail.id), detail);
      void qc.invalidateQueries({ queryKey: DRIVER_NS });
    },
  });
}

/** Single PATCH for master data + lifecycle (`resigned`, `depositReturned`). */
export function useUpdateDriver(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: DriverUpdateInput): Promise<DriverDetail> => {
      const { data, error } = await api.PATCH('/partner/portal/drivers/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as DriverDetail;
    },
    onSuccess: (detail) => {
      qc.setQueryData(qk.partner.driver.detail(id), detail);
      void qc.invalidateQueries({ queryKey: DRIVER_NS });
    },
  });
}

// ---- documents (presign → PUT → confirm; single instance per kind) --------------

export interface UploadDocumentInput {
  kind: DriverDocumentKind;
  file: File;
}

/** Mirrors the file-input `accept` list — anything else is rejected before presign. */
const ALLOWED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/**
 * Full presigned-upload orchestration (same flow as checkpoint media):
 * compress images client-side → presign → PUT the bytes (S3 in prod, the
 * API's dev sink otherwise) → confirm. Confirming replaces any previous
 * document of the same kind.
 */
export function useUploadDriverDocument(driverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadDocumentInput): Promise<DriverDocument> => {
      if (!ALLOWED_DOCUMENT_TYPES.includes(input.file.type)) {
        throw new ApiErrorException({
          code: 'VALIDATION_ERROR',
          message: 'Format file tidak didukung (JPG, PNG, atau PDF).',
        });
      }
      const isImage = input.file.type.startsWith('image/');
      // compressImage re-encodes both image kinds to JPEG.
      const blob = isImage ? await compressImage(input.file) : input.file;
      const contentType = isImage ? 'image/jpeg' : 'application/pdf';

      const { data: presignData, error: presignError } = await api.POST(
        '/partner/portal/drivers/documents/{driverId}/presign',
        {
          params: { path: { driverId } },
          body: { kind: input.kind, contentType, sizeBytes: blob.size },
        },
      );
      if (presignError) throwEnvelope(presignError);
      const presign = unwrap(presignData) as PresignDocumentResult;

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
        '/partner/portal/drivers/documents/{driverId}/{documentId}/confirm',
        { params: { path: { driverId, documentId: presign.documentId } } },
      );
      if (confirmError) throwEnvelope(confirmError);
      return unwrap(confirmData) as DriverDocument;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: DRIVER_NS }),
  });
}
