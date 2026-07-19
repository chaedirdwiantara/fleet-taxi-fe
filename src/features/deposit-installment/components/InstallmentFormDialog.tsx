import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { ApiErrorException } from '@/lib/api-client/client';
import { useCreateInstallment, useDriverOptionsQuery, useUpdateInstallment } from '../hooks';
import type { InstallmentRule, InstallmentUpsertInput } from '../types';

// Numeric inputs stay strings in the form (RHF-friendly); toInput() converts.
const intString = (requiredMsg: string, invalidMsg: string) =>
  z.string().trim().min(1, requiredMsg).regex(/^\d+$/, invalidMsg);

const formSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').max(150, 'Maksimal 150 karakter'),
  driverName: z.string().min(1, 'Driver wajib dipilih'),
  installmentAmount: intString('Nominal wajib diisi', 'Nominal harus bilangan bulat').refine(
    (v) => Number(v) > 0,
    'Nominal harus lebih dari 0',
  ),
  installmentCount: intString('Durasi wajib diisi', 'Durasi harus bilangan bulat').refine(
    (v) => Number(v) >= 1 && Number(v) <= 999,
    'Durasi harus 1–999',
  ),
  minDailySetoran: z.string().trim().regex(/^\d*$/, 'Min setoran harus bilangan bulat').optional(),
  effectiveDate: z.string().min(1, 'Tanggal aktif wajib diisi'),
  note: z.string().trim().max(500, 'Maksimal 500 karakter').optional(),
});

type FormValues = z.infer<typeof formSchema>;

function toInput(values: FormValues): InstallmentUpsertInput {
  return {
    title: values.title,
    driverName: values.driverName,
    installmentAmount: Number(values.installmentAmount),
    installmentCount: Number(values.installmentCount),
    minDailySetoran: values.minDailySetoran ? Number(values.minDailySetoran) : undefined,
    effectiveDate: values.effectiveDate,
    note: values.note || undefined,
  };
}

// Shared create/edit dialog. Mount with key={initial?.id ?? 'create'} so the
// form reinitializes per row (RentalFormDialog precedent).
export function InstallmentFormDialog({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: InstallmentRule | null;
  onClose: () => void;
}) {
  const isEdit = initial != null;
  const drivers = useDriverOptionsQuery(open);
  const create = useCreateInstallment();
  const update = useUpdateInstallment();
  const mutation = isEdit ? update : create;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initial?.title ?? '',
      driverName: initial?.driverName ?? '',
      installmentAmount: initial != null ? String(initial.installmentAmount) : '',
      installmentCount: initial != null ? String(initial.installmentCount) : '',
      minDailySetoran: initial?.minDailySetoran != null ? String(initial.minDailySetoran) : '',
      effectiveDate: initial?.effectiveDate ?? '',
      note: initial?.note ?? '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const input = toInput(values);
    if (isEdit) {
      update.mutate({ id: initial.id, input }, { onSuccess: onClose });
    } else {
      create.mutate(input, { onSuccess: onClose });
    }
  });

  const apiError =
    mutation.error instanceof ApiErrorException
      ? mutation.error.message
      : mutation.error
        ? 'Terjadi kesalahan. Coba lagi.'
        : null;

  // Edited rules may reference a driver no longer in the options (old import
  // data) — keep it selectable so editing doesn't silently clear the field.
  const options = drivers.data ?? [];
  const hasInitialDriver =
    initial != null && !options.some((o) => o.driverName === initial.driverName);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Cicilan Deposit' : 'Tambah Cicilan Deposit'}</DialogTitle>
          <DialogDescription>
            Cicilan dipotong otomatis dari surplus setoran harian driver (berdasarkan data import
            Fleet Monitoring) sampai total cicilan (nominal × durasi) terlunasi.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul</FormLabel>
                  <FormControl>
                    <Input placeholder="cth. Cicilan Deposit Driver Halim" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="driverName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full" aria-label="Pilih driver">
                        <SelectValue
                          placeholder={drivers.isPending ? 'Memuat driver…' : 'Pilih driver'}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hasInitialDriver && (
                        <SelectItem value={initial.driverName}>{initial.driverName}</SelectItem>
                      )}
                      {options.map((o) => (
                        <SelectItem key={o.driverName} value={o.driverName}>
                          {o.driverName}
                          <span className="text-muted-foreground"> · {o.lastPlate}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Daftar driver diambil dari data import atas plat terdaftar Anda.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="installmentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nominal Cicilan (Rp)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" placeholder="25000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="installmentCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durasi (jumlah cicilan)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" placeholder="20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="minDailySetoran"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Setoran Harian (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="Opsional"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Setoran wajib harian — tidak diambil untuk cicilan. Hanya surplus di atas
                      nilai ini yang memotong cicilan (boleh sebagian; kekurangan/kelebihan dibawa
                      ke hari berikutnya). Kosongkan untuk potong nominal penuh per hari aktif.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Aktif</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="cth. Deposit 500.000" {...field} />
                  </FormControl>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
