import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, PlugZap, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { formatDateTimeWIB } from '@/lib/datetime';
import { useSaveGojekPortalSettings, useTestGojekPortalConnection } from '../hooks';
import {
  settingsSchema,
  toSettingsInput,
  toSettingsValues,
  type SettingsValues,
} from '../settingsSchema';
import { MAX_LOOKBACK_DAYS, RUN_AT_OPTIONS, type GojekPortalSyncSettings } from '../types';

/**
 * Portal account + daily schedule. The password field is write-only: it stays
 * blank when a password is on file and an empty submit keeps the stored one.
 * "Uji Koneksi" tests what is typed (or the stored account when blank) and
 * never saves. Buttons lock on the mutation's `isPending`, never inside the
 * click handler itself — disabling the submitter mid-submit cancels the form.
 */
export function SettingsForm({ settings }: { settings: GojekPortalSyncSettings }) {
  const save = useSaveGojekPortalSettings();
  const test = useTestGojekPortalConnection();
  const [saved, setSaved] = useState(false);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: toSettingsValues(settings),
  });

  // Server state is the source of truth; re-seed after every successful save
  // (and on first load) but never clobber unsaved edits from a background refetch.
  useEffect(() => {
    if (!form.formState.isDirty) form.reset(toSettingsValues(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const onSubmit = form.handleSubmit((values) => {
    setSaved(false);
    test.reset();
    save.mutate(toSettingsInput(values), {
      onSuccess: (next) => {
        form.reset(toSettingsValues(next));
        setSaved(true);
      },
    });
  });

  const onTest = () => {
    setSaved(false);
    const { email, password } = form.getValues();
    test.mutate({ email: email.trim() || undefined, password: password || undefined });
  };

  const busy = save.isPending || test.isPending;
  const keyMissing = !settings.encryptionConfigured;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Akun &amp; Jadwal</CardTitle>
        <CardDescription>
          Akun Fleet Partner Portal yang dipakai untuk mengunduh laporan{' '}
          <em>Transaction History for Reconciliation</em>. Kata sandi disimpan terenkripsi dalam
          bentuk digest dan tidak pernah ditampilkan kembali.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="gps-email">Email portal</FormLabel>
                    <FormControl>
                      <Input
                        id="gps-email"
                        type="email"
                        autoComplete="off"
                        placeholder="finance@perusahaan.id"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="gps-password">Kata sandi portal</FormLabel>
                    <FormControl>
                      <Input
                        id="gps-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder={
                          settings.hasPassword ? '•••••••• (tersimpan)' : 'Kata sandi akun portal'
                        }
                        disabled={keyMissing}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {keyMissing
                        ? 'Kunci enkripsi server belum diatur — kata sandi belum bisa disimpan.'
                        : settings.hasPassword
                          ? 'Kosongkan untuk mempertahankan kata sandi tersimpan.'
                          : 'Wajib diisi sebelum jadwal bisa diaktifkan.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
              <FormField
                control={form.control}
                name="runAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="gps-run-at">Jam tarik harian (WIB)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger id="gps-run-at" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-64">
                        {RUN_AT_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Dicek tiap 30 menit; berjalan pada slot pertama setelah jam ini.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lookbackDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="gps-lookback">Hari mundur</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger id="gps-lookback" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: MAX_LOOKBACK_DAYS }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d} hari
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Rentang tarikan = kemarin mundur sejumlah hari ini; hari berjalan tidak
                      ditarik.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isEnabled"
                render={({ field }) => (
                  <FormItem className="sm:pt-7">
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <Switch
                          id="gps-enabled"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Jadwal aktif"
                        />
                      </FormControl>
                      <FormLabel htmlFor="gps-enabled" className="cursor-pointer">
                        Jadwal aktif
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {save.isError && (
              <p className="text-sm text-destructive" role="alert">
                Gagal menyimpan: {save.error.message}
              </p>
            )}
            {test.isError && (
              <p className="text-sm text-destructive" role="alert">
                Uji koneksi gagal: {test.error.message}
              </p>
            )}
            {test.isSuccess && (
              <p
                className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"
                role="status"
              >
                <CheckCircle2 className="size-4" aria-hidden />
                Koneksi berhasil — login sebagai {test.data.email}
                {test.data.verifiedAt
                  ? ` (${formatDateTimeWIB(test.data.verifiedAt)})`
                  : ' (isian form, belum disimpan)'}
                .
              </p>
            )}
            {saved && !save.isError && (
              <p
                className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"
                role="status"
              >
                <CheckCircle2 className="size-4" aria-hidden />
                Pengaturan tersimpan.
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onTest} disabled={busy}>
                {test.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <PlugZap aria-hidden />
                )}
                Uji Koneksi
              </Button>
              <Button type="submit" disabled={busy}>
                {save.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Save aria-hidden />
                )}
                Simpan
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
