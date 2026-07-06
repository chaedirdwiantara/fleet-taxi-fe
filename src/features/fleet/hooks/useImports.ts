import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, ApiErrorException, type ApiError } from '@/lib/api-client/client';
import { qk, type Platform } from '@/lib/query-client';

export type ImportBatch = {
  id: number;
  filename: string;
  periodMonth: number;
  periodYear: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
  totalRows: number;
  processed: number;
  percent: number;
  importedBy: number | null;
  uploaderName: string | null; // "Diunggah Oleh" — resolved server-side
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

const throwEnvelope = (error: unknown): never => {
  throw new ApiErrorException((error as { error: ApiError }).error);
};

export function useImportsQuery(platform: Platform) {
  return useQuery({
    queryKey: qk.fleet.imports(platform),
    queryFn: async (): Promise<ImportBatch[]> => {
      const { data, error } = await api.GET('/admin/fleet/{platform}/imports', {
        params: { path: { platform } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as ImportBatch[];
    },
  });
}

export function useImportStatusQuery(platform: Platform, importId: number | null) {
  return useQuery({
    queryKey: qk.fleet.importStatus(platform, String(importId)),
    queryFn: async (): Promise<ImportBatch> => {
      const { data, error } = await api.GET('/admin/fleet/{platform}/imports/{id}', {
        params: { path: { platform, id: importId! } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as ImportBatch;
    },
    enabled: importId !== null,
    // Always poll while the batch is still being processed. The socket (when
    // reachable) patches the cache faster, but the poll is the GUARANTEED
    // backstop: if `/rt` isn't delivering, the popup must still reach "done"
    // instead of hanging on "processing" forever (both paths are idempotent).
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'processing' || status === 'pending' ? 1500 : false;
    },
    refetchIntervalInBackground: true,
  });
}

export function useUploadImport(platform: Platform) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: File; month: number; year: number }) => {
      const fd = new FormData();
      fd.append('file', input.file);
      fd.append('month', String(input.month));
      fd.append('year', String(input.year));
      const { data, error } = await api.POST('/admin/fleet/{platform}/imports', {
        params: { path: { platform } },
        // typed body is the multipart schema; the serializer sends FormData
        body: { file: '', month: input.month, year: input.year },
        bodySerializer: () => fd,
      });
      if (error) throwEnvelope(error);
      return unwrap(data) as { importId: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.fleet.imports(platform) });
    },
  });
}

export function useRollbackImport(platform: Platform) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (importId: number) => {
      const { data, error } = await api.DELETE('/admin/fleet/{platform}/imports/{id}', {
        params: { path: { platform, id: importId } },
      });
      if (error) throwEnvelope(error);
      return unwrap(data);
    },
    onSuccess: (_data, importId) => {
      // Drop the deleted batch's status query outright — the imports-list key
      // is a prefix of importStatus keys, so a plain invalidate would refetch
      // GET /imports/:id for the now-removed batch and 404.
      qc.removeQueries({ queryKey: qk.fleet.importStatus(platform, String(importId)) });
      qc.invalidateQueries({ queryKey: qk.fleet.imports(platform) });
      qc.invalidateQueries({ queryKey: ['fleet', platform, 'grid'] });
    },
  });
}
