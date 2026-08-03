import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { plateSchema, toPlateInput, type PlateValues } from '../plateSchema';
import type { PlateInput } from '../types';

const EMPTY: PlateValues = { plateNumber: '', vehicleType: '' };

/**
 * The two-field plate form, shared by the "Tambah Plat" card (`create`, fields
 * side by side from `sm` up) and the Edit dialog (`edit`, always stacked).
 * `onSubmit` receives a `done` callback to run once the server accepted the
 * write — the form uses it to clear itself; closing the dialog stays the
 * caller's business.
 */
export function PlateForm({
  mode,
  defaultValues,
  pending,
  error,
  idPrefix,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  defaultValues?: PlateValues;
  pending: boolean;
  error: Error | null;
  /** Namespaces the input ids so both forms can be mounted at once. */
  idPrefix: string;
  onSubmit: (input: PlateInput, done: () => void) => void;
  onCancel?: () => void;
}) {
  const isCreate = mode === 'create';
  const form = useForm<PlateValues>({
    resolver: zodResolver(plateSchema),
    defaultValues: defaultValues ?? EMPTY,
  });

  const submit = form.handleSubmit((values) =>
    onSubmit(toPlateInput(values), () => form.reset(isCreate ? EMPTY : values)),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className={cn('grid gap-3', isCreate && 'sm:grid-cols-1')} noValidate>
        <div
          className={cn(
            'grid gap-3',
            isCreate && 'sm:grid-cols-[1fr_1fr_auto] sm:items-start sm:gap-4',
          )}
        >
          <FormField
            control={form.control}
            name="plateNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor={`${idPrefix}-plate`}>Nomor Plat</FormLabel>
                <FormControl>
                  <Input
                    id={`${idPrefix}-plate`}
                    placeholder="B 1793 SCP"
                    autoComplete="off"
                    maxLength={20}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor={`${idPrefix}-type`}>Type (opsional)</FormLabel>
                <FormControl>
                  <Input
                    id={`${idPrefix}-type`}
                    placeholder="Premium - BYD M6"
                    autoComplete="off"
                    maxLength={100}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* aligns the button with the inputs, past the invisible label row */}
          {isCreate && (
            <Button type="submit" disabled={pending} className="sm:mt-[1.625rem]">
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              Tambah
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        )}

        {!isCreate && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Simpan
            </Button>
          </DialogFooter>
        )}
      </form>
    </Form>
  );
}
