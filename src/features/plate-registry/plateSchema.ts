import { z } from 'zod';

// Mirrors the backend DTO (plateNumber 1–20, vehicleType ≤100) so a rejected
// value is caught before the request, with the message in Bahasa Indonesia.
export const plateSchema = z.object({
  plateNumber: z
    .string()
    .trim()
    .min(1, 'Nomor plat wajib diisi')
    .max(20, 'Nomor plat maksimal 20 karakter'),
  vehicleType: z.string().trim().max(100, 'Type maksimal 100 karakter'),
});

export type PlateValues = z.infer<typeof plateSchema>;

/** Form values → request body; an empty Type is omitted, not sent as ''. */
export const toPlateInput = (values: PlateValues) => ({
  plateNumber: values.plateNumber.trim(),
  vehicleType: values.vehicleType.trim() || undefined,
});
