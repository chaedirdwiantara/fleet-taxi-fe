import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Loader2, Search, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Switch } from '@/components/ui/switch';
import { formatRupiah } from '@/lib/money';
import { usePartnerPlatesQuery } from '@/features/partner/hooks';
import { matchCogsKey } from '../cogsMatcher';
import {
  useCogsDefaultsQuery,
  useCreateRental,
  useTaxSettingsQuery,
  useUpdateRental,
} from '../hooks';
import { plateOverlapClashes } from '../lib/plateOverlap';
import { formatPpnRate } from '../lib/ppnRate';
import {
  RENTAL_TYPES,
  type PaymentStatus,
  type RentalItem,
  type RentalPaymentProof,
  type RentalType,
  type RentalUpsertInput,
} from '../types';
import { PaymentProofUploader } from './PaymentProofUploader';

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
// startDate/endDate range and the price AS QUOTED — a monthly booking comes
// back as its monthly price with unit "bulan", never as a derived day rate.
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
  const taxSettings = useTaxSettingsQuery();
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
  const [price, setPrice] = useState(
    initial ? String(initial.pricePerMonth ?? initial.pricePerDay) : '',
  );
  const [priceUnit, setPriceUnit] = useState<'hari' | 'bulan'>(initial?.priceUnit ?? 'hari');
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
  // Evidence is uploaded before the rental exists (create) and sent as ids on save.
  const [proofs, setProofs] = useState<RentalPaymentProof[]>(initial?.paymentProofs ?? []);
  // PPN is a per-transaction choice: on by default for a PKP partner, off for a
  // sale outside the scope of VAT. An edit starts from what the row was written
  // with, and a settled row is locked — the BE keeps the rate the customer paid.
  const [applyPpn, setApplyPpn] = useState(initial ? initial.ppnRateBps > 0 : true);
  const ppnLocked = initial?.paymentStatus === 'Sudah Dibayar';
  // A non-PKP partner never charges PPN, so the switch is only offered to a
  // PKP — or on a row that already carries tax, so it can still be read.
  const ppnAvailable =
    taxSettings.isSuccess &&
    (taxSettings.data.isPkp || (initial != null && initial.ppnRateBps > 0));

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

  // Renting the same plate twice over the same dates is legitimate (a six-hour
  // let, then another the same day), so the backend refuses it only until the
  // partner confirms — see lib/plateOverlap. The clash list arrives with that
  // refusal; ticking the box re-sends the write with `allowOverlap`.
  const [allowOverlap, setAllowOverlap] = useState(false);
  const overlapClashes = plateOverlapClashes(mutation.error);

  // A clash describes this exact plate + range, so editing either retires both
  // the warning and the acknowledgement rather than leaving a stale one armed.
  const scheduleChanged = () => {
    setAllowOverlap(false);
    if (mutation.isError) mutation.reset();
  };

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
    scheduleChanged();
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

  const isPaid = paymentStatus === 'Sudah Dibayar';
  // The backend enforces this too — the UI just refuses to send a doomed call.
  const missingProof = isPaid && proofs.length === 0;

  const dateOrderInvalid = !!startDate && !!endDate && endDate < startDate;
  const canSubmit =
    !!plateNumber &&
    !!startDate &&
    !!endDate &&
    !dateOrderInvalid &&
    price.trim() !== '' &&
    Number(price) > 0 &&
    cogsPerDay != null &&
    !missingProof &&
    (overlapClashes == null || allowOverlap);

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
      applyPpn,
      ...(proofs.length ? { paymentProofIds: proofs.map((p) => p.id) } : {}),
      ...(allowOverlap ? { allowOverlap: true } : {}),
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
                {RENTAL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
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
              onChange={(e) => {
                setStartDate(e.target.value);
                scheduleChanged();
              }}
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
              onChange={(e) => {
                setEndDate(e.target.value);
                scheduleChanged();
              }}
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
              <p className="text-xs text-muted-foreground">
                Harga per bulan dibagi jumlah hari kalender bulan berjalan (28–31 hari); satu bulan
                penuh ditagih tepat sebesar harga ini.
              </p>
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

        {/* Full width under the 2-col grid, like the evidence list below: the
            tax choice affects the whole bill, not one field. */}
        {ppnAvailable && taxSettings.isSuccess && (
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="rental-form-ppn" className="text-sm font-medium">
                Kenakan PPN {formatPpnRate(taxSettings.data.statutoryRateBps)}
              </Label>
              <p className="text-xs text-muted-foreground">
                {ppnLocked
                  ? 'Transaksi sudah dibayar, jadi PPN mengikuti tagihan yang telah dilunasi. Ubah status bayar ke Belum Dibayar dulu bila tagihannya perlu direvisi.'
                  : 'Matikan untuk transaksi yang tidak dikenai PPN. PPN dihitung dari sewa ditambah biaya tambahan; deposit tidak dikenakan PPN.'}
              </p>
            </div>
            <Switch
              id="rental-form-ppn"
              checked={applyPpn}
              onCheckedChange={setApplyPpn}
              disabled={ppnLocked || mutation.isPending}
            />
          </div>
        )}
        {taxSettings.isSuccess && !ppnAvailable && (
          <p className="text-xs text-muted-foreground">
            PPN tidak dikenakan karena partner belum berstatus PKP. Aktifkan lewat “Atur PPN” bila
            diperlukan.
          </p>
        )}

        {/* Full width under the 2-col grid: evidence is a list, not a field.
            Kept visible after a revert so the history stays reachable. */}
        {(isPaid || proofs.length > 0) && (
          <PaymentProofUploader
            proofs={proofs}
            onChange={setProofs}
            disabled={mutation.isPending}
          />
        )}
        {missingProof && (
          <p className="text-xs text-muted-foreground">
            Unggah minimal satu bukti pembayaran untuk menyimpan transaksi sebagai Sudah Dibayar.
          </p>
        )}
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

      {/* An overlap is a question, not a failure, so it gets a warning panel
          with the clashing bookings spelled out — not the red error line. */}
      {overlapClashes && (
        <div
          role="alert"
          className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
        >
          <p className="flex items-start gap-2 font-medium">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            <span>
              Plat {plateNumber} sudah punya rental pada rentang tanggal ini. Pastikan ini bukan
              data yang terinput dua kali.
            </span>
          </p>
          <ul className="ml-6 list-disc space-y-0.5 text-muted-foreground">
            {overlapClashes.map((clash) => (
              <li key={clash}>{clash}</li>
            ))}
          </ul>
          <label className="ml-6 flex items-start gap-2 font-medium">
            <Checkbox
              checked={allowOverlap}
              onCheckedChange={(checked) => setAllowOverlap(checked === true)}
              disabled={mutation.isPending}
              className="mt-0.5"
            />
            <span>Ya, ini penyewaan terpisah — simpan tetap.</span>
          </label>
        </div>
      )}

      {mutation.isError && !overlapClashes && (
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
