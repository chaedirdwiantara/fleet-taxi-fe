import type { components } from '@/lib/api-client/schema';

// Shapes come straight from the generated OpenAPI client so they stay in lockstep
// with the backend contract (regenerated via `pnpm gen:api`).
export type AdminUser = components['schemas']['AdminUser'];
export type Partner = components['schemas']['Partner'];
export type ApiKeyCreated = components['schemas']['ApiKeyCreated'];

export type StaffRole = 'admin' | 'finance' | 'super_admin';
