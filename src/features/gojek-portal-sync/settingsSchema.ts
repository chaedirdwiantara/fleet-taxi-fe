import { z } from 'zod';
import type { GojekPortalSyncSettings, GojekPortalSyncSettingsInput } from './types';
import { MAX_LOOKBACK_DAYS, RUN_AT_OPTIONS } from './types';

export const settingsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email akun portal wajib diisi')
    .email('Format email tidak valid'),
  password: z.string().max(200, 'Kata sandi terlalu panjang'),
  isEnabled: z.boolean(),
  runAt: z.string().refine((v) => RUN_AT_OPTIONS.includes(v), 'Pilih jam kelipatan 30 menit'),
  lookbackDays: z
    .number()
    .int()
    .min(1, 'Minimal 1 hari')
    .max(MAX_LOOKBACK_DAYS, `Maksimal ${MAX_LOOKBACK_DAYS} hari`),
});

export type SettingsValues = z.infer<typeof settingsSchema>;

export function toSettingsValues(s: GojekPortalSyncSettings | undefined): SettingsValues {
  return {
    email: s?.email ?? '',
    password: '',
    isEnabled: s?.isEnabled ?? false,
    runAt: s?.runAt ?? '05:00',
    lookbackDays: s?.lookbackDays ?? 1,
  };
}

export function toSettingsInput(v: SettingsValues): GojekPortalSyncSettingsInput {
  return {
    email: v.email.trim(),
    ...(v.password ? { password: v.password } : {}),
    isEnabled: v.isEnabled,
    runAt: v.runAt,
    lookbackDays: v.lookbackDays,
  };
}
