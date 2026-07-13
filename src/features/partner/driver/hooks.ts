import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, unwrapWithMeta, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { compressImage } from '@/features/partner/checkpoint/compressImage';
import { resolveMediaUrl } from '@/features/partner/checkpoint/hooks';
import { qk } from '@/lib/query-client';
import type {
  CheckableDocKind,
  DecisionAction,
  DriverDetail,
  DriverDocument,
  DriverDocumentKind,
  DriverSummary,
  DriverUpdateInput,
  PresignDocumentResult,
  RegistrationDetail,
  RegistrationSummary,
  RegistrationUpsertInput,
  ResignationDetail,
  ResignationSummary,
} from './types';

// Driver management — one drivers row travels through three stages
// (registration → active roster → resignation); every mutation invalidates
// the whole ['partner','driver'] namespace so all three lists stay fresh.

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

const DRIVER_NS = ['partner', 'driver'] as const;

export { resolveMediaUrl };

// ---- registrations (pending | rejected) --------------------------------------

export function useRegistrationsQuery(params: { q?: string; page: number }) {
  return useQuery({
    queryKey: qk.partner.driver.registrations(params),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await api.GET('/partner/portal/driver-registrations', {
        params: { query: { page: String(params.page), ...(params.q && { q: params.q }) } },
      });
      if (error) throwEnvelope(error);
      const { data: rows, meta } = unwrapWithMeta(data);
      return { rows: rows as RegistrationSummary[], meta };
    },
  });
}

export function useRegistrationQuery(id: number) {
  return useQuery({
    queryKey: qk.partner.driver.registration(id),
    queryFn: async (): Promise<RegistrationDetail> => {
      const { data, error } = await api.GET('/partner/portal/driver-registrations/{id}', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as RegistrationDetail;
    },
  });
}

export function useCreateRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RegistrationUpsertInput): Promise<RegistrationDetail> => {
      const { data, error } = await api.POST('/partner/portal/driver-registrations', { body });
      if (error) throwEnvelope(error);
      return unwrap(data) as RegistrationDetail;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DRIVER_NS }),
  });
}

export function useUpdateRegistration(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<RegistrationUpsertInput>): Promise<RegistrationDetail> => {
      const { data, error } = await api.PATCH('/partner/portal/driver-registrations/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as RegistrationDetail;
    },
    onSuccess: (detail) => {
      qc.setQueryData(qk.partner.driver.registration(id), detail);
      void qc.invalidateQueries({ queryKey: DRIVER_NS });
    },
  });
}

export function useDeleteRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await api.DELETE('/partner/portal/driver-registrations/{id}', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: qk.partner.driver.registration(id) });
      void qc.invalidateQueries({ queryKey: DRIVER_NS });
    },
  });
}

/** Shared onSuccess for the verification-page mutations: keep the cached detail hot. */
function useRegistrationDetailSuccess(id: number) {
  const qc = useQueryClient();
  return (detail: RegistrationDetail) => {
    qc.setQueryData(qk.partner.driver.registration(id), detail);
    void qc.invalidateQueries({ queryKey: DRIVER_NS });
  };
}

export function useDocCheck(id: number) {
  const onSuccess = useRegistrationDetailSuccess(id);
  return useMutation({
    mutationFn: async (input: { kind: CheckableDocKind; verified: boolean }) => {
      const { data, error } = await api.POST('/partner/portal/driver-registrations/{id}/doc-check', {
        params: { path: { id } },
        body: input,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as RegistrationDetail;
    },
    onSuccess,
  });
}

export function useSetDeposit(id: number) {
  const onSuccess = useRegistrationDetailSuccess(id);
  return useMutation({
    mutationFn: async (input: { amount: number }) => {
      const { data, error } = await api.POST('/partner/portal/driver-registrations/{id}/deposit', {
        params: { path: { id } },
        body: input,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as RegistrationDetail;
    },
    onSuccess,
  });
}

export function useDecideDeposit(id: number) {
  const onSuccess = useRegistrationDetailSuccess(id);
  return useMutation({
    mutationFn: async (input: { action: DecisionAction; note?: string }) => {
      const { data, error } = await api.POST(
        '/partner/portal/driver-registrations/{id}/deposit/decision',
        { params: { path: { id } }, body: input },
      );
      if (error) throwEnvelope(error);
      return unwrap(data) as RegistrationDetail;
    },
    onSuccess,
  });
}

/** Approve moves the row to the active roster (registration detail then 404s). */
export function useVerifyRegistration(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { action: DecisionAction; rejectNote?: string }) => {
      const { data, error } = await api.POST('/partner/portal/driver-registrations/{id}/verify', {
        params: { path: { id } },
        body: input,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as RegistrationDetail;
    },
    onSuccess: (detail, input) => {
      if (input.action === 'approve') {
        // The row left the registration slice — drop the stale detail cache.
        qc.removeQueries({ queryKey: qk.partner.driver.registration(id) });
      } else {
        qc.setQueryData(qk.partner.driver.registration(id), detail);
      }
      void qc.invalidateQueries({ queryKey: DRIVER_NS });
    },
  });
}

// ---- active drivers -----------------------------------------------------------

export function useDriversQuery(params: { q?: string; plate?: string; active?: string; page: number }) {
  return useQuery({
    queryKey: qk.partner.driver.drivers(params),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await api.GET('/partner/portal/drivers', {
        params: {
          query: {
            page: String(params.page),
            ...(params.q && { q: params.q }),
            ...(params.plate && { plate: params.plate }),
            ...((params.active === 'true' || params.active === 'false') && {
              active: params.active as 'true' | 'false',
            }),
          },
        },
      });
      if (error) throwEnvelope(error);
      const { data: rows, meta } = unwrapWithMeta(data);
      return { rows: rows as DriverSummary[], meta };
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

/** Moves the driver to the resignation list (deposit return handled there). */
export function useResignDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<ResignationDetail> => {
      const { data, error } = await api.POST('/partner/portal/drivers/{id}/resign', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as ResignationDetail;
    },
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: qk.partner.driver.detail(id) });
      void qc.invalidateQueries({ queryKey: DRIVER_NS });
    },
  });
}

// ---- resignations ---------------------------------------------------------------

export function useResignationsQuery(params: { q?: string; page: number }) {
  return useQuery({
    queryKey: qk.partner.driver.resignations(params),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await api.GET('/partner/portal/driver-resignations', {
        params: { query: { page: String(params.page), ...(params.q && { q: params.q }) } },
      });
      if (error) throwEnvelope(error);
      const { data: rows, meta } = unwrapWithMeta(data);
      return { rows: rows as ResignationSummary[], meta };
    },
  });
}

export function useResignationQuery(id: number) {
  return useQuery({
    queryKey: qk.partner.driver.resignation(id),
    queryFn: async (): Promise<ResignationDetail> => {
      const { data, error } = await api.GET('/partner/portal/driver-resignations/{id}', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as ResignationDetail;
    },
  });
}

function useResignationDetailSuccess(id: number) {
  const qc = useQueryClient();
  return (detail: ResignationDetail) => {
    qc.setQueryData(qk.partner.driver.resignation(id), detail);
    void qc.invalidateQueries({ queryKey: DRIVER_NS });
  };
}

/** Requires an uploaded deposit_return_proof; puts the return in `waiting`. */
export function useRequestDepositReturn(id: number) {
  const onSuccess = useResignationDetailSuccess(id);
  return useMutation({
    mutationFn: async (): Promise<ResignationDetail> => {
      const { data, error } = await api.POST(
        '/partner/portal/driver-resignations/{id}/deposit-return',
        { params: { path: { id } } },
      );
      if (error) throwEnvelope(error);
      return unwrap(data) as ResignationDetail;
    },
    onSuccess,
  });
}

export function useDecideDepositReturn(id: number) {
  const onSuccess = useResignationDetailSuccess(id);
  return useMutation({
    mutationFn: async (input: { action: DecisionAction; note?: string }) => {
      const { data, error } = await api.POST(
        '/partner/portal/driver-resignations/{id}/deposit-return/decision',
        { params: { path: { id } }, body: input },
      );
      if (error) throwEnvelope(error);
      return unwrap(data) as ResignationDetail;
    },
    onSuccess,
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
