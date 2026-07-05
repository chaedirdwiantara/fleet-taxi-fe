import { z } from 'zod';

// Absolute URL (https://api.fleet-taxi.id) in prod, or a root-relative path
// (/api, /rt) in dev where the Vite proxy handles it — so plain z.url() is
// too strict here.
const urlOrPath = z
  .string()
  .min(1)
  .refine(
    (v) => v.startsWith('/') || /^(https?|wss?):\/\//.test(v),
    'must be an absolute URL or a root-relative path',
  );

export const env = z
  .object({
    VITE_API_BASE_URL: urlOrPath,
    VITE_WS_URL: urlOrPath,
    VITE_APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
    VITE_USE_MSW: z.enum(['true', 'false']).default('false'),
  })
  .parse(import.meta.env);
