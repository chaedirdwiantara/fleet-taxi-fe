import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatRupiah } from '@/lib/money';
import { usePartnerPlatesQuery } from '@/features/partner/hooks';
import { matchCogsKey } from '../cogsMatcher';
import { useCogsDefaultsQuery, useCreateRental, useUpdateRental } from '../hooks';
import type { PaymentStatus, RentalItem, RentalType, RentalUpsertInput } from '../types';

const OTHER = '__other';

// The shadcn Input base is `display:flex`, which collapses Chrome's internal
// date-input layout and leaves the calendar icon glued to the text. `block`
// restores the native layout (icon pinned to the right edge); ml-auto covers
// engines that do lay the shadow parts out as flex items.
const DATE_INPUT_CLASS =
  'block [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:cursor-pointer';

const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const INFO_SOURCES = [
  'Tiktok',
  'Instagram',
  'Existing Customer',
  'New CS',
  'GS',
  'Driver',
  'Trevo',
] as const;

// Create + edit share one form; the edit variant is prefilled with the FULL
// startDate/endDate range, priceUnit "hari", and price = pricePerDay.
export function RentalFormDialog({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: RentalItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Rental Data' : 'Tambah Rental Data'}</DialogTitle>
        </DialogHeader>
        {/* keyed remount → the form re-initializes per picked row / fresh create */}
        {open && <RentalForm key={initial?.id ?? 'create'} initial={initial} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}

function RentalForm({ initial, onClose }: { initial: RentalItem | null; onClose: () => void }) {
  const plates = usePartnerPlatesQuery();
  const cogsDefaults = useCogsDefaultsQuery();
  const create = useCreateRental();
  const update = useUpdateRental();
  const mutation = initial ? update : create;

  // Kendaraan & Jadwal
  const [plateNumber, setPlateNumber] = useState(initial?.plateNumber ?? '');
  const [rentalType, setRentalType] = useState<RentalType | ''>(initial?.rentalType ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [serviceArea, setServiceArea] = useState(initial?.serviceArea ?? '');
  const [plateQuery, setPlateQuery] = useState('');

  // Biaya & Pembayaran
  const [price, setPrice] = useState(initial ? String(initial.pricePerDay) : '');
  const [priceUnit, setPriceUnit] = useState<'hari' | 'bulan'>('hari');
  const [cogsKey, setCogsKey] = useState(initial?.cogsType ?? '');
  const [cogsPerDay, setCogsPerDay] = useState<number | null>(initial ? initial.cogsPerDay : null);
  const [deposit, setDeposit] = useState(initial && initial.deposit ? String(initial.deposit) : '');
  const [additionalCost, setAdditionalCost] = useState(
    initial && initial.additionalCost ? String(initial.additionalCost) : '',
  );
  const [additionalCostDescription, setAdditionalCostDescription] = useState(
    initial?.additionalCostDescription ?? '',
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    initial?.paymentStatus ?? 'Belum Dibayar',
  );

  // Informasi Pelanggan
  const [customerName, setCustomerName] = useState(initial?.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? '');
  const initialInfoInList = (INFO_SOURCES as readonly string[]).includes(initial?.infoSource ?? '');
  const [infoChoice, setInfoChoice] = useState(
    initial?.infoSource ? (initialInfoInList ? initial.infoSource : OTHER) : '',
  );
  const [infoOther, setInfoOther] = useState(
    initial?.infoSource && !initialInfoInList ? initial.infoSource : '',
  );

  const selectedPlate = useMemo(
    () => plates.data?.find((p) => p.plateNumber === plateNumber),
    [plates.data, plateNumber],
  );

  // Type-to-filter for the plate list; matches ignore spacing/case, on plate or type.
  const filteredPlates = useMemo(() => {
    const all = plates.data ?? [];
    const q = plateQuery.trim();
    if (!q) return all;
    const qNorm = normalizePlate(q);
    const qLower = q.toLowerCase();
    return all.filter(
      (p) =>
        (qNorm && normalizePlate(p.plateNumber).includes(qNorm)) ||
        (p.vehicleType ?? '').toLowerCase().includes(qLower),
    );
  }, [plates.data, plateQuery]);

  const pickPlate = (nextPlateNumber: string) => {
    setPlateNumber(nextPlateNumber);
    // auto-pick the COGS preset from the plate's vehicle type keywords
    const plate = plates.data?.find((p) => p.plateNumber === nextPlateNumber);
    const key = matchCogsKey(plate?.vehicleType);
    const preset = key ? cogsDefaults.data?.find((c) => c.key === key) : undefined;
    if (preset) {
      setCogsKey(preset.key);
      setCogsPerDay(preset.cogsPerDay);
    }
  };

  const pickCogs = (key: string) => {
    const preset = cogsDefaults.data?.find((c) => c.key === key);
    if (!preset) return;
    setCogsKey(preset.key);
    setCogsPerDay(preset.cogsPerDay);
  };

  const dateOrderInvalid = !!startDate && !!endDate && endDate < startDate;
  const canSubmit =
    !!plateNumber &&
    !!startDate &&
    !!endDate &&
    !dateOrderInvalid &&
    price.trim() !== '' &&
    Number(price) > 0 &&
    cogsPerDay != null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || cogsPerDay == null) return;
    const infoSource = infoChoice === OTHER ? infoOther.trim() : infoChoice;
    const body: RentalUpsertInput = {
      plateNumber,
      vehicleType: selectedPlate?.vehicleType ?? initial?.vehicleType ?? undefined,
      // the form no longer manages region; keep whatever the row already has
      region: initial?.region ?? undefined,
      startDate,
      endDate,
      price: Number(price),
      priceUnit,
      cogsPerDay,
      cogsType: cogsKey || undefined,
      additionalCost: additionalCost.trim() ? Number(additionalCost) : undefined,
      additionalCostDescription: additionalCostDescription.trim() || undefined,
      deposit: deposit.trim() ? Number(deposit) : undefined,
      rentalType: rentalType || undefined,
      infoSource: infoSource || undefined,
      serviceArea: serviceArea.trim() || undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      paymentStatus,
    };
    if (initial) {
      update.mutate({ id: initial.id, body }, { onSuccess: onClose });
    } else {
      create.mutate(body, { onSuccess: onClose });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-3">
        <SectionHeading>Kendaraan &amp; Jadwal</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-plate">Plat</Label>
            <Select
              value={plateNumber}
              onValueChange={pickPlate}
              onOpenChange={(o) => !o && setPlateQuery('')}
            >
              <SelectTrigger id="rental-form-plate" className="w-full">
                <SelectValue placeholder="Pilih plat" />
              </SelectTrigger>
              <SelectContent>
                {/* type-to-filter; stopPropagation keeps Radix's typeahead from
                    stealing keystrokes / moving focus off the input */}
                <div className="sticky top-0 z-10 bg-popover p-1 pb-1.5">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      aria-label="Cari plat"
                      value={plateQuery}
                      onChange={(e) => setPlateQuery(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Ketik nomor plat…"
                      className="h-8 pl-8"
                    />
                  </div>
                </div>
                {filteredPlates.map((p) => (
                  <SelectItem key={p.id} value={p.plateNumber}>
                    {p.plateNumber}
                    {p.vehicleType ? ` — ${p.vehicleType}` : ''}
                  </SelectItem>
                ))}
                {plates.isSuccess && plates.data.length > 0 && filteredPlates.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    Tidak ada plat yang cocok dengan “{plateQuery.trim()}”.
                  </p>
                )}
              </SelectContent>
            </Select>
            {plates.isSuccess && plates.data.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Belum ada plat terdaftar — daftarkan dulu di{' '}
                <Link to="/partner/daftarkan-plat" className="font-medium text-primary underline">
                  Daftarkan Plat
                </Link>
                .
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-type">Tipe Rental</Label>
            <Select value={rentalType} onValueChange={(v) => setRentalType(v as RentalType)}>
              <SelectTrigger id="rental-form-type" className="w-full">
                <SelectValue placeholder="Pilih tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dengan Driver">Dengan Driver</SelectItem>
                <SelectItem value="Lepas Kunci">Lepas Kunci</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-area">Area Layanan</Label>
            <Input
              id="rental-form-area"
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              placeholder="Jabodetabek"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-start">Tanggal Mulai</Label>
            <Input
              id="rental-form-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className={DATE_INPUT_CLASS}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-end">Tanggal Selesai</Label>
            <Input
              id="rental-form-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className={DATE_INPUT_CLASS}
            />
          </div>
        </div>
        {dateOrderInvalid && (
          <p className="text-sm text-destructive" role="alert">
            Tanggal selesai harus sama atau setelah tanggal mulai.
          </p>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <SectionHeading>Biaya &amp; Pembayaran</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-price">Harga</Label>
            <div className="flex gap-2">
              <Input
                id="rental-form-price"
                type="number"
                min={0}
                step={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="900000"
                required
                className="flex-1"
              />
              <Select value={priceUnit} onValueChange={(v) => setPriceUnit(v as 'hari' | 'bulan')}>
                <SelectTrigger className="w-28" aria-label="Satuan harga">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hari">Hari</SelectItem>
                  <SelectItem value="bulan">Bulan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {priceUnit === 'bulan' && (
              <p className="text-xs text-muted-foreground">Harga per bulan dibagi 30 hari.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-cogs">COGS/Hari</Label>
            <Select value={cogsKey} onValueChange={pickCogs}>
              <SelectTrigger id="rental-form-cogs" className="w-full">
                <SelectValue placeholder="Pilih tipe COGS" />
              </SelectTrigger>
              <SelectContent>
                {(cogsDefaults.data ?? []).map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label} — {formatRupiah(c.cogsPerDay)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cogsPerDay != null && (
              <p className="text-xs text-muted-foreground">
                COGS dipakai: {formatRupiah(cogsPerDay)}/hari
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-deposit">Deposit</Label>
            <Input
              id="rental-form-deposit"
              type="number"
              min={0}
              step={1000}
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-addcost">Additional Cost</Label>
            <Input
              id="rental-form-addcost"
              type="number"
              min={0}
              step={1000}
              value={additionalCost}
              onChange={(e) => setAdditionalCost(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-addcost-desc">Deskripsi Additional Cost</Label>
            <Input
              id="rental-form-addcost-desc"
              value={additionalCostDescription}
              onChange={(e) => setAdditionalCostDescription(e.target.value)}
              placeholder="Antar jemput bandara"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-status">Status Bayar</Label>
            <Select
              value={paymentStatus}
              onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}
            >
              <SelectTrigger id="rental-form-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Belum Dibayar">Belum Dibayar</SelectItem>
                <SelectItem value="Sudah Dibayar">Sudah Dibayar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <SectionHeading>Informasi Pelanggan</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-customer">Nama</Label>
            <Input
              id="rental-form-customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nama customer"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rental-form-phone">Telepon</Label>
            <Input
              id="rental-form-phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="0812…"
              maxLength={30}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="rental-form-info">Sumber Info</Label>
            <Select value={infoChoice} onValueChange={setInfoChoice}>
              <SelectTrigger id="rental-form-info" className="w-full">
                <SelectValue placeholder="Pilih sumber info" />
              </SelectTrigger>
              <SelectContent>
                {INFO_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER}>Others</SelectItem>
              </SelectContent>
            </Select>
            {infoChoice === OTHER && (
              <Input
                aria-label="Sumber info lainnya"
                value={infoOther}
                onChange={(e) => setInfoOther(e.target.value)}
                placeholder="Sumber info"
                maxLength={100}
              />
            )}
          </div>
        </div>
      </div>

      {mutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutation.error.message}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" disabled={mutation.isPending || !canSubmit}>
          {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Simpan
        </Button>
      </DialogFooter>
    </form>
  );
}
