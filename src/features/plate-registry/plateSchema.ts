import { z } from 'zod';

// Mirrors the backend DTO (plateNumber 1–20, vehicleType and partnerName ≤100)
// so a rejected value is caught before the request, with the message in
// Bahasa Indonesia. `partnerName` only reaches the form on the admin registry.
export const plateSchema = z.object({
  plateNumber: z
    .string()
    .trim()
    .min(1, 'Nomor plat wajib diisi')
    .max(20, 'Nomor plat maksimal 20 karakter'),
  vehicleType: z.string().trim().max(100, 'Type maksimal 100 karakter'),
  partnerName: z.string().trim().max(100, 'Nama partner maksimal 100 karakter'),
});

export type PlateValues = z.infer<typeof plateSchema>;

/**
 * Form values → request body. Empty optionals are omitted rather than sent as
 * '', and `partnerName` is only sent by the registry that owns that field.
 */
export const toPlateInput = (values: PlateValues, withPartnerName: boolean) => ({
  plateNumber: values.plateNumber.trim(),
  vehicleType: values.vehicleType.trim() || undefined,
  ...(withPartnerName ? { partnerName: values.partnerName.trim() || undefined } : {}),
});
