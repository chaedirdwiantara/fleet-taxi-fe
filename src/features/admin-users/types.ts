// Response shapes for the admin-users endpoints. The BE OpenAPI schema only
// documents request DTOs (responses are presenter-shaped and unwrapped from the
// envelope), so these mirror the backend presenters and pair with the
// intentional `unwrap(data) as T` casts in hooks.ts.
export interface AdminUser {
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
}

export interface Partner {
  id: number;
  code: string;
  name: string;
  type?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeyCreated {
  id: number;
  keyPrefix: string;
  rawKey: string;
}

export type StaffRole = 'admin' | 'finance' | 'super_admin';
