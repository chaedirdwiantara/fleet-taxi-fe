import { z } from 'zod';

/**
 * Every field of the Checkpoint Baru form is required: a completed checkpoint
 * becomes a berita acara, so both parties and a reachable contact have to be on
 * record before the inspection starts.
 */
export const createCheckpointSchema = z.object({
  plateNumber: z.string().min(1, 'Nomor plat wajib dipilih'),
  handoverType: z.string().min(1, 'Jenis serah terima wajib dipilih'),
  giverName: z.string().trim().min(1, 'Nama penyerah wajib diisi'),
  receiverName: z.string().trim().min(1, 'Nama penerima wajib diisi'),
  counterpartPhone: z
    .string()
    .trim()
    .min(1, 'Telepon wajib diisi')
    .regex(/^[\d+][\d\s()+-]{5,}$/, 'Nomor telepon tidak valid'),
});

export type CreateCheckpointInput = z.infer<typeof createCheckpointSchema>;
export type CreateCheckpointErrors = Partial<Record<keyof CreateCheckpointInput, string>>;

/**
 * First issue per field wins, so an empty phone reads "wajib diisi" rather than
 * the format complaint that also fires on an empty string.
 */
export function createCheckpointErrors(input: unknown): CreateCheckpointErrors {
  const result = createCheckpointSchema.safeParse(input);
  if (result.success) return {};
  const errors: CreateCheckpointErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]) as keyof CreateCheckpointErrors;
    errors[field] ??= issue.message;
  }
  return errors;
}
