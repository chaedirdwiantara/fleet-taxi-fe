import { createFileRoute } from '@tanstack/react-router';
import { UserManagementPage } from '@/features/admin-users/UserManagementPage';

// super_admin-only account management (create + list admin & partner accounts).
// The page component (+ its super_admin gate) lives in the feature folder; the
// backend (CASL) is the real authority.
export const Route = createFileRoute('/_admin/admin/user-management')({
  component: UserManagementPage,
});
