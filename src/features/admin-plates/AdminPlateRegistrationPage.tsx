import { AccessDenied } from '@/components/shared/AccessDenied';
import { useAdminSession } from '@/features/auth/hooks';
import { PlateRegistry } from '@/features/plate-registry/PlateRegistry';
import {
  useAdminPlatesQuery,
  useDeleteAdminPlate,
  useRegisterAdminPlate,
  useUpdateAdminPlate,
} from './hooks';
import type { AdminPlate } from './types';

/**
 * super_admin-only Plate Registration: the admin console's own plate registry.
 * Same screen as the partner portal's Daftarkan Plat, plus a Partner column —
 * the page is gated client-side for UX; the backend (CASL) is the real authority.
 */
export function AdminPlateRegistrationPage() {
  const { data: session } = useAdminSession();
  const isSuperAdmin = (session?.roles ?? []).includes('super_admin');

  const list = useAdminPlatesQuery();
  const register = useRegisterAdminPlate();
  const update = useUpdateAdminPlate();
  const remove = useDeleteAdminPlate();

  if (!isSuperAdmin) return <AccessDenied what="Halaman registrasi plat" />;

  return (
    <PlateRegistry<AdminPlate>
      title="Plate Registration"
      description="Daftarkan plat kendaraan agar datanya muncul di Gojek Monitoring — termasuk plat yang belum didaftarkan partner mana pun. Registrasi di sini tidak terlihat oleh partner."
      emptyDescription="Tambahkan plat pertama di atas agar datanya muncul di Gojek Monitoring."
      controller={{ list, register, update, remove }}
      showPartnerColumn
      partnerColumnNote="Kolom Partner memakai Nama Partner yang Anda isi. Bila dikosongkan, yang tampil adalah partner yang mendaftarkan plat yang sama di portalnya (badge bergaris); “—” berarti belum ada keduanya."
    />
  );
}
