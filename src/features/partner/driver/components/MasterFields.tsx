import { Link } from '@tanstack/react-router';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePartnerPlatesQuery } from '@/features/partner/hooks';
import type { DriverDetail, DriverUpdateInput } from '../types';

// Master-data fields of the driver edit page's Informasi Driver card. Plain
// controlled object state — the form owns it and remounts per driver (keyed
// remount pattern).

const NONE = '__none';

// The shadcn Input base is `display:flex`, which collapses Chrome's internal
// date-input layout (same fix as RentalFormDialog).
const DATE_INPUT_CLASS =
  'block [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:cursor-pointer';

export interface MasterFormValues {
  name: string;
  email: string;
  phone: string;
  ktpNo: string;
  simNo: string;
  simExpired: string;
  address: string;
  bankAccount: string;
  plateNumber: string;
}

export function masterValuesFrom(initial: DriverDetail): MasterFormValues {
  return {
    name: initial.name,
    email: initial.email ?? '',
    phone: initial.phone ?? '',
    ktpNo: initial.ktpNo ?? '',
    simNo: initial.simNo ?? '',
    simExpired: initial.simExpired ?? '',
    address: initial.address ?? '',
    bankAccount: initial.bankAccount ?? '',
    plateNumber: initial.plateNumber ?? '',
  };
}

export function masterInputFrom(values: MasterFormValues): DriverUpdateInput {
  return {
    name: values.name.trim(),
    email: values.email.trim() || undefined,
    phone: values.phone.trim() || undefined,
    ktpNo: values.ktpNo.trim() || undefined,
    simNo: values.simNo.trim() || undefined,
    simExpired: values.simExpired || undefined,
    address: values.address.trim() || undefined,
    bankAccount: values.bankAccount.trim() || undefined,
    plateNumber: values.plateNumber || undefined,
  };
}

export function MasterFields({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string;
  values: MasterFormValues;
  onChange: (patch: Partial<MasterFormValues>) => void;
}) {
  const plates = usePartnerPlatesQuery();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Nama</Label>
        <Input
          id={`${idPrefix}-name`}
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Budi Santoso"
          maxLength={150}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={values.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="budi@example.com"
          maxLength={150}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-phone`}>Telepon</Label>
        <Input
          id={`${idPrefix}-phone`}
          value={values.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="0812…"
          maxLength={30}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-ktp`}>Nomor KTP</Label>
        <Input
          id={`${idPrefix}-ktp`}
          value={values.ktpNo}
          onChange={(e) => onChange({ ktpNo: e.target.value })}
          placeholder="3174xxxxxxxxxxxx"
          maxLength={30}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-sim`}>Nomor SIM</Label>
        <Input
          id={`${idPrefix}-sim`}
          value={values.simNo}
          onChange={(e) => onChange({ simNo: e.target.value })}
          placeholder="1234-5678-901234"
          maxLength={30}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-sim-expired`}>Masa Berlaku SIM</Label>
        <Input
          id={`${idPrefix}-sim-expired`}
          type="date"
          value={values.simExpired}
          onChange={(e) => onChange({ simExpired: e.target.value })}
          className={DATE_INPUT_CLASS}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-plate`}>Plat Unit</Label>
        <Select
          value={values.plateNumber || NONE}
          onValueChange={(v) => onChange({ plateNumber: v === NONE ? '' : v })}
        >
          <SelectTrigger id={`${idPrefix}-plate`} className="w-full">
            <SelectValue placeholder="Pilih plat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Tanpa plat</SelectItem>
            {(plates.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.plateNumber}>
                {p.plateNumber}
                {p.vehicleType ? ` — ${p.vehicleType}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {plates.isSuccess && plates.data.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Belum ada plat terdaftar — daftarkan dulu di{' '}
            <Link to="/partner/daftarkan-plat" className="font-medium text-primary underline">
              Plate Registration
            </Link>
            .
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-bank`}>Rekening Bank</Label>
        <Input
          id={`${idPrefix}-bank`}
          value={values.bankAccount}
          onChange={(e) => onChange({ bankAccount: e.target.value })}
          placeholder="BCA 1234567890 a.n. Budi"
          maxLength={150}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-address`}>Alamat</Label>
        <Input
          id={`${idPrefix}-address`}
          value={values.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="Jl. Melati No. 1, Jakarta Selatan"
          maxLength={250}
        />
      </div>
    </div>
  );
}
