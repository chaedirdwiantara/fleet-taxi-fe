import { createFileRoute } from '@tanstack/react-router';
import {
  useDeletePlate,
  usePartnerPlatesQuery,
  useRegisterPlate,
  useUpdatePlate,
} from '@/features/partner/hooks';
import { PlateRegistry } from '@/features/plate-registry/PlateRegistry';
import type { PartnerPlate } from '@/features/partner/types';

// "Daftarkan Plat" (legacy /partner/plates: nomor + Type). Registered plates
// define which vehicles the partner sees on the Gojek/Grab monitoring pages.
// The screen itself is shared with the admin console's Plate Registration; only
// the endpoints behind the controller and the copy differ.
export const Route = createFileRoute('/_partner/partner/daftarkan-plat')({
  component: DaftarkanPlatPage,
});

function DaftarkanPlatPage() {
  const list = usePartnerPlatesQuery();
  const register = useRegisterPlate();
  const update = useUpdatePlate();
  const remove = useDeletePlate();

  return (
    <PlateRegistry<PartnerPlate>
      title="Daftarkan Plat"
      description="Daftarkan nomor plat kendaraan Anda untuk melihat data setoran Gojek & Grab yang bersangkutan."
      emptyDescription="Tambahkan plat pertama Anda di atas untuk mulai melihat data setorannya."
      controller={{ list, register, update, remove }}
    />
  );
}
