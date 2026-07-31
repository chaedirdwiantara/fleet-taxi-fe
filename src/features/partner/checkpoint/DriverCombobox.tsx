import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDriverPickerQuery } from '@/features/partner/driver/hooks';
import type { DriverSummary } from '@/features/partner/driver/types';
import { cn } from '@/lib/utils';

/**
 * Driver picker for the handover party whose side is a driver. Searching runs
 * server-side (debounced), so a large roster stays fully reachable instead of
 * being silently truncated to the first page. Selecting a driver reports its
 * phone too, so the contact field can follow along.
 *
 * The value is the driver's *name*: a checkpoint is handover evidence and must
 * survive roster changes, exactly like its plate number.
 */
export function DriverCombobox({
  id,
  value,
  onChange,
  placeholder = 'Pilih driver',
}: {
  id?: string;
  value: string;
  onChange: (name: string, driver: DriverSummary) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Only fetch the roster once the picker is actually opened
  const drivers = useDriverPickerQuery(debounced, open);
  const rows = drivers.data?.rows ?? [];
  const truncated = (drivers.data?.total ?? 0) > rows.length;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {/* Server-side search: cmdk must not filter the results again */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Cari nama driver…"
            aria-label="Cari nama driver"
          />
          <CommandList>
            {drivers.isError ? (
              <div className="px-3 py-6 text-center text-sm text-destructive">
                Gagal memuat daftar driver.
              </div>
            ) : (
              <CommandEmpty>
                {drivers.isFetching ? 'Memuat…' : 'Driver tidak ditemukan.'}
              </CommandEmpty>
            )}
            <CommandGroup>
              {rows.map((driver) => (
                <CommandItem
                  key={driver.id}
                  value={String(driver.id)}
                  onSelect={() => {
                    onChange(driver.name, driver);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn('shrink-0', driver.name === value ? 'opacity-100' : 'opacity-0')}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {driver.name}
                    {driver.resignedAt && <span className="text-muted-foreground"> · resign</span>}
                  </span>
                  {driver.plateNumber && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {driver.plateNumber}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {truncated && (
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                Menampilkan {rows.length} dari {drivers.data?.total} driver — ketik untuk mencari.
              </p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
