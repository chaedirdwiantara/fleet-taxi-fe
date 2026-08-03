import { createFileRoute } from '@tanstack/react-router';
import { AdminPlateRegistrationPage } from '@/features/admin-plates/AdminPlateRegistrationPage';

// super_admin-only "Plate Registration" — the admin console's own plate
// registry. Registering here widens the admin fleet scope to vehicles no
// partner registered; it never widens what a partner sees.
export const Route = createFileRoute('/_admin/admin/plate-registration')({
  component: AdminPlateRegistrationPage,
});
