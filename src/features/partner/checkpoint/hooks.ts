import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  unwrap,
  unwrapWithMeta,
  ApiErrorException,
  type ApiError,
} from '@/lib/api-client/client';
import { env } from '@/lib/env';
import { qk } from '@/lib/query-client';
import { compressImage } from './compressImage';
import type {
  CheckpointDetail,
  CheckpointMedia,
  CheckpointPoint,
  CheckpointSummary,
  HandoverType,
  MediaKind,
  PointKey,
  PresignResult,
} from './types';

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

/**
 * Media/upload URLs from the BE are relative in dev (the API's own endpoints,
 * reached through the Vite proxy) and absolute presigned S3 URLs in prod.
 */
export function resolveMediaUrl(url: string): string {
  return url.startsWith('/') ? `${env.VITE_API_BASE_URL}${url}` : url;
}

export interface CheckpointListFilters {
  page: number;
  plate?: string;
  handoverType?: string;
  status?: string;
  /** WIB period filter; both must be set to take effect. */
  month?: number;
  year?: number;
}

export function useCheckpointsQuery(filters: CheckpointListFilters) {
  return useQuery({
    queryKey: qk.partner.checkpoint.list(filters),
    queryFn: async () => {
      const { data, error } = await api.GET('/partner/portal/checkpoints', {
        params: {
          query: {
            page: String(filters.page),
            ...(filters.plate && { plate: filters.plate }),
            ...(filters.handoverType && {
              handoverType: filters.handoverType as HandoverType,
            }),
            ...(filters.status && { status: filters.status as 'draft' | 'completed' }),
            ...(filters.month &&
              filters.year && { month: String(filters.month), year: String(filters.year) }),
          },
        },
      });
      if (error) throwEnvelope(error);
      const { data: rows, meta } = unwrapWithMeta(data);
      return { rows: rows as CheckpointSummary[], meta };
    },
  });
}

export function useCheckpointQuery(id: number) {
  return useQuery({
    queryKey: qk.partner.checkpoint.detail(id),
    queryFn: async (): Promise<CheckpointDetail> => {
      const { data, error } = await api.GET('/partner/portal/checkpoints/{id}', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as CheckpointDetail;
    },
  });
}

/** Previous paired delivery checkpoint (null for delivery types / no history). */
export function useComparisonQuery(id: number, enabled: boolean) {
  return useQuery({
    queryKey: qk.partner.checkpoint.comparison(id),
    enabled,
    queryFn: async (): Promise<CheckpointDetail | null> => {
      const { data, error } = await api.GET('/partner/portal/checkpoints/{id}/comparison', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as CheckpointDetail | null;
    },
  });
}

export function useCreateCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      plateNumber: string;
      handoverType: HandoverType;
      counterpartName?: string;
      counterpartPhone?: string;
    }) => {
      const { data, error } = await api.POST('/partner/portal/checkpoints', {
        body: body as never,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as CheckpointDetail;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['partner', 'checkpoint', 'list'] });
    },
  });
}

export function useUpdateCheckpoint(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      counterpartName?: string;
      counterpartPhone?: string;
      odometerKm?: number;
      batteryPercent?: number;
      generalNotes?: string;
    }) => {
      const { data, error } = await api.PATCH('/partner/portal/checkpoints/{id}', {
        params: { path: { id } },
        body: body as never,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as CheckpointDetail;
    },
    onSuccess: (detail) => {
      qc.setQueryData(qk.partner.checkpoint.detail(id), detail);
    },
  });
}

export function useUpdatePoint(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pointKey: PointKey; passed?: boolean; note?: string }) => {
      const { data, error } = await api.PATCH(
        '/partner/portal/checkpoints/{id}/points/{pointKey}',
        {
          params: { path: { id, pointKey: input.pointKey } },
          body: { passed: input.passed, note: input.note } as never,
        },
      );
      if (error) throwEnvelope(error);
      return unwrap(data) as CheckpointPoint;
    },
    onSuccess: (point) => {
      // Patch the cached detail in place: no full refetch per toggle/note
      qc.setQueryData(
        qk.partner.checkpoint.detail(id),
        (prev: CheckpointDetail | undefined) =>
          prev && {
            ...prev,
            points: prev.points.map((p) => (p.pointKey === point.pointKey ? point : p)),
          },
      );
    },
  });
}

export function useCompleteCheckpoint(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      odometerKm: number;
      batteryPercent: number;
      generalNotes?: string;
    }) => {
      const { data, error } = await api.POST('/partner/portal/checkpoints/{id}/complete', {
        params: { path: { id } },
        body: body as never,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as CheckpointDetail;
    },
    onSuccess: (detail) => {
      qc.setQueryData(qk.partner.checkpoint.detail(id), detail);
      void qc.invalidateQueries({ queryKey: ['partner', 'checkpoint', 'list'] });
    },
  });
}

export function useDeleteMedia(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mediaId: number) => {
      const { data, error } = await api.DELETE('/partner/portal/checkpoints/{id}/media/{mediaId}', {
        params: { path: { id, mediaId } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.partner.checkpoint.detail(id) });
    },
  });
}

/** Deletes a DRAFT checkpoint (the BE rejects completed ones with 409). */
export function useDeleteCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await api.DELETE('/partner/portal/checkpoints/{id}', {
        params: { path: { id } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: qk.partner.checkpoint.detail(id) });
      void qc.invalidateQueries({ queryKey: ['partner', 'checkpoint', 'list'] });
    },
  });
}

export interface UploadMediaInput {
  kind: MediaKind;
  pointKey?: PointKey;
  /** Raw file/blob; photos are compressed client-side before upload. */
  blob: File | Blob;
}

/**
 * Full presigned-upload orchestration: compress (photos) → presign → PUT the
 * bytes (S3 in prod, the API's sink in dev) → confirm. Each photo uploads
 * independently, so a dropped connection outdoors loses at most one photo.
 */
export function useUploadMedia(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadMediaInput): Promise<CheckpointMedia> => {
      const blob = input.kind === 'photo' ? await compressImage(input.blob) : input.blob;
      const contentType = input.kind === 'photo' ? 'image/jpeg' : 'image/png';

      const { data: presignData, error: presignError } = await api.POST(
        '/partner/portal/checkpoints/{id}/media/presign',
        {
          params: { path: { id } },
          body: {
            kind: input.kind,
            pointKey: input.pointKey,
            contentType,
            sizeBytes: blob.size,
          } as never,
        },
      );
      if (presignError) throwEnvelope(presignError);
      const presign = unwrap(presignData) as PresignResult;

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
        '/partner/portal/checkpoints/{id}/media/{mediaId}/confirm',
        { params: { path: { id, mediaId: presign.mediaId } } },
      );
      if (confirmError) throwEnvelope(confirmError);
      return unwrap(confirmData) as CheckpointMedia;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.partner.checkpoint.detail(id) });
    },
  });
}

/** Downloads the berita acara PDF via fetch (cookie auth) and saves it. */
export async function downloadCheckpointPdf(id: number): Promise<void> {
  const res = await fetch(`${env.VITE_API_BASE_URL}/partner/portal/checkpoints/${id}/pdf`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new ApiErrorException({
      code: 'DOWNLOAD_FAILED',
      message: `Gagal mengunduh PDF (${res.status})`,
    });
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = `berita-acara-checkpoint-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
