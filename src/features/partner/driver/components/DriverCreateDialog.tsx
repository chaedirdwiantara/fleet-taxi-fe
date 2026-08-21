import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePartnerPlatesQuery } from '@/features/partner/hooks';
import { ApiErrorException } from '@/lib/api-client/client';
import { useCreateDriver } from '../hooks';
import type { DriverCreateInput, DriverDetail } from '../types';

// Tambah Driver — manual registration for drivers the Gojek/Grab import does
// not carry (new hire, rental-only, or a name the import spells differently).
// Deliberately the registration essentials only: documents, deposit and the
// home survey are completed on the edit page, exactly like a synced row.

// The shadcn Input base is `display:flex`, which collapses Chrome's internal
// date-input layout (same fix as MasterFields/RentalFormDialog).
const DATE_INPUT_CLASS =
  'block [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:cursor-pointer';

const NO_PLATE = '__none';

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional();

const formSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(120, 'Maksimal 120 karakter'),
  phone: optionalText(30, 'Maksimal 30 karakter'),
  email: z
    .string()
    .trim()
    .max(254, 'Maksimal 254 karakter')
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Format email tidak valid')
    .optional(),
  ktpNo: optionalText(32, 'Maksimal 32 karakter'),
  simNo: optionalText(32, 'Maksimal 32 karakter'),
  simExpired: z.string().optional(),
  plateNumber: z.string().optional(),
  bankAccount: optionalText(120, 'Maksimal 120 karakter'),
  address: optionalText(500, 'Maksimal 500 karakter'),
});

type FormValues = z.infer<typeof formSchema>;

const blank = (v: string | undefined) => (v && v !== '' ? v : undefined);

function toInput(values: FormValues): DriverCreateInput {
  return {
    name: values.name.trim(),
    phone: blank(values.phone),
    email: blank(values.email),
    ktpNo: blank(values.ktpNo),
    simNo: blank(values.simNo),
    simExpired: blank(values.simExpired),
    plateNumber: values.plateNumber === NO_PLATE ? undefined : blank(values.plateNumber),
    bankAccount: blank(values.bankAccount),
    address: blank(values.address),
  };
}

export function DriverCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** Hand the fresh row to the caller so it can jump to the edit page. */
  onCreated: (driver: DriverDetail) => void;
}) {
  const plates = usePartnerPlatesQuery();
  const create = useCreateDriver();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      ktpNo: '',
      simNo: '',
      simExpired: '',
      plateNumber: NO_PLATE,
      bankAccount: '',
      address: '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(toInput(values), { onSuccess: onCreated });
  });

  const apiError =
    create.error instanceof ApiErrorException
      ? create.error.message
      : create.error
        ? 'Terjadi kesalahan. Coba lagi.'
        : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Driver</DialogTitle>
          <DialogDescription>
            Untuk driver yang belum terbaca di data import Gojek/Grab. Cukup isi nama — dokumen,
            deposit, dan survey rumah dilengkapi di halaman detail.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-5" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input placeholder="Budi Santoso" autoFocus {...field} />
                  </FormControl>
                  <FormDescription>
                    Tulis sama persis dengan nama di data import agar tidak jadi dua baris.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* `content-start` wajib pada baris 2 kolom: FormItem adalah grid,
                dan tanpa ini isinya ter-stretch mengikuti sel tertinggi. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="content-start">
                    <FormLabel>Telepon</FormLabel>
                    <FormControl>
                      <Input inputMode="tel" placeholder="0812…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="content-start">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="budi@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="ktpNo"
                render={({ field }) => (
                  <FormItem className="content-start">
                    <FormLabel>Nomor KTP</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="3174xxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="simNo"
                render={({ field }) => (
                  <FormItem className="content-start">
                    <FormLabel>Nomor SIM</FormLabel>
                    <FormControl>
                      <Input placeholder="1234-5678-901234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="simExpired"
                render={({ field }) => (
                  <FormItem className="content-start">
                    <FormLabel>Masa Berlaku SIM</FormLabel>
                    <FormControl>
                      <Input type="date" className={DATE_INPUT_CLASS} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plateNumber"
                render={({ field }) => (
                  <FormItem className="content-start">
                    <FormLabel>Plat Unit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih plat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_PLATE}>Tanpa plat</SelectItem>
                        {(plates.data ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.plateNumber}>
                            {p.plateNumber}
                            {p.vehicleType ? ` — ${p.vehicleType}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {plates.isSuccess && plates.data.length === 0 && (
                      <FormDescription>
                        Belum ada plat terdaftar — daftarkan dulu di{' '}
                        <Link
                          to="/partner/daftarkan-plat"
                          className="font-medium text-primary underline"
                        >
                          Plate Registration
                        </Link>
                        .
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bankAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Rekening Bank{' '}
                    <span className="font-normal text-muted-foreground">(opsional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="BCA 1234567890 a.n. Budi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Alamat Rumah{' '}
                    <span className="font-normal text-muted-foreground">(opsional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Jl. Melati No. 1, RT 03 / RW 05, Jakarta Selatan"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Foto survey rumah dan titik lokasinya dilengkapi di halaman detail driver.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {apiError && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {apiError}
              </div>
            )}

            <DialogFooter className="gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Batal
              </Button>
              <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">
                {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                {create.isPending ? 'Menyimpan…' : 'Simpan & Lengkapi'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
