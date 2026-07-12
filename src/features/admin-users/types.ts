// The regenerated OpenAPI schema doesn't emit named response components for
// these payloads (responses are untyped envelopes), so the shapes live here.
// They mirror what the backend presenters return — keep in lockstep manually.

export type AdminUser = {
  id: number;
  email: string;
  fullName: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt?: string | null;
  partner: {
    id: number;
    code: string;
    name: string;
    type: string | null;
  } | null;
};

export type Partner = {
  id: number;
  code: string;
  name: string;
  type?: string | null;
  isActive: boolean;
  createdAt: string;
};

export type ApiKeyCreated = {
  id: number;
  keyPrefix: string;
  rawKey: string;
};

export type StaffRole = 'admin' | 'finance' | 'super_admin';
