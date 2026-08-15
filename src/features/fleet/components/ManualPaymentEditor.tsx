import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useDetailQuery, useEditDriver } from '../hooks/useDetails';

// Proses / Edit satu record Manual Payment (port of the legacy edit_driver form
// for raw rows, minus Bukti Transaksi / approval Finance): assign a plate so
// the record merges into that plate's row + counts toward the summary, and set
// Masuk / Tidak Masuk Setoran. Also reachable from the Detail Transaksi modal
// to re-edit an already-processed record (admin picked the wrong status).
// Target & grouping are intentionally untouched here (legacy
// skip_target_grouping): processing a raw row must never overwrite the
// destination plate's target.

const schema = z.object({
  driverName: z.string().trim().min(1, 'Nama driver wajib diisi'),
  vehiclePlate: z.string().trim().min(1, 'Plat kendaraan wajib diisi'),
  isManualPaymentSetoran: z.enum(['0', '1']),
  manualPaymentNote: z.string(),
});
type FormValues = z.infer<typeof schema>;

export function ManualPaymentEditor({
  detailId,
  month,
  year,
  onClose,
}: {
  detailId: number;
  month: number;
  year: number;
  onClose: () => void;
}) {
  const detail = useDetailQuery('gojek', detailId, { month, year });
  const editDriver = useEditDriver('gojek');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    // concrete defaults keep every input controlled from the first render
    // (the async `values` prefill lands after the detail query resolves)
    defaultValues: {
      driverName: '',
      vehiclePlate: '',
      isManualPaymentSetoran: '1',
      manualPaymentNote: '',
    },
    values: detail.data
      ? {
          driverName: detail.data.driverName ?? '',
          vehiclePlate: detail.data.vehiclePlate ?? '',
          isManualPaymentSetoran: detail.data.isManualPaymentSetoran === 0 ? '0' : '1',
          manualPaymentNote: detail.data.manualPaymentNote ?? '',
        }
      : undefined,
  });
  const setoran = useWatch({ control: form.control, name: 'isManualPaymentSetoran' });

  const onSubmit = form.handleSubmit(async (v) => {
    await editDriver.mutateAsync({
      detailId,
      // the record's own period keeps the update on one partition even when it
      // was opened from a grid showing a different month
      month: detail.data?.periodMonth ?? month,
      year: detail.data?.periodYear ?? year,
      driverName: v.driverName,
      vehiclePlate: v.vehiclePlate,
      isManualPaymentSetoran: v.isManualPaymentSetoran === '0' ? 0 : 1,
      manualPaymentNote: v.isManualPaymentSetoran === '0' ? v.manualPaymentNote : undefined,
    });
    onClose();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proses / Edit Manual Payment</DialogTitle>
          <DialogDescription>
            Isi plat kendaraan &amp; status setoran agar transaksi ini masuk ke baris platnya dan
            dihitung di summary.
          </DialogDescription>
        </DialogHeader>

        {detail.isPending && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {detail.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Gagal memuat detail transaksi: {detail.error.message}
          </p>
        )}

        {detail.isSuccess && (
          <Form {...form}>
            <form onSubmit={onSubmit} className="grid gap-4">
              <FormField
                control={form.control}
                name="driverName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama driver</FormLabel>
                    <FormControl>
                      <Input autoCapitalize="characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vehiclePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plat kendaraan</FormLabel>
                    <FormControl>
                      <Input placeholder="mis. B 1234 XYZ" autoCapitalize="characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isManualPaymentSetoran"
                render={({ field }) => (
                  <FormItem className="rounded-md border bg-muted/30 p-3">
                    <FormLabel>Status Setoran</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="1"
                            checked={field.value === '1'}
                            onChange={() => field.onChange('1')}
                            className="size-4 accent-emerald-600"
                          />
                          Masuk Setoran
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="0"
                            checked={field.value === '0'}
                            onChange={() => field.onChange('0')}
                            className="size-4 accent-purple-600"
                          />
                          Tidak Masuk Setoran
                        </label>
                      </div>
                    </FormControl>
                    {/* The choice is routinely misread as "does the driver
                        still owe this?". It does not: both options settle the
                        obligation, they differ only in what counts as omset. */}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Kedua pilihan sama-sama melunasi kewajiban hari itu —{' '}
                      <strong>Outstanding tetap berkurang</strong>. Bedanya hanya pada omset: “Tidak
                      Masuk Setoran” tidak ikut dihitung sebagai setoran (Total Deduction &amp;
                      TOTAL HARI INI).
                    </p>
                    {setoran === '0' && (
                      <FormField
                        control={form.control}
                        name="manualPaymentNote"
                        render={({ field: noteField }) => (
                          <FormItem className="mt-2">
                            <FormLabel>Keterangan</FormLabel>
                            <FormControl>
                              <Input placeholder="Alasan tidak masuk setoran" {...noteField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editDriver.isError && (
                <p className="text-sm text-destructive">
                  Gagal menyimpan: {editDriver.error.message}
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Batal
                </Button>
                <Button type="submit" disabled={editDriver.isPending}>
                  {editDriver.isPending ? 'Menyimpan…' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
