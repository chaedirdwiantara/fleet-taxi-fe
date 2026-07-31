import { useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PartnerPlate } from '@/features/partner/types';

const normPlate = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Searchable plate picker. Replaces the plain Select: with thousands of
 * registered plates the user types a fragment instead of scrolling, and the
 * plain overflow list avoids Radix Select's hover-scroll-button quirks.
 */
export function PlateCombobox({
  id,
  plates,
  loading,
  value,
  onChange,
  invalid = false,
}: {
  id?: string;
  plates: PartnerPlate[];
  loading: boolean;
  value: string;
  onChange: (plateNumber: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = normPlate(query);
    if (!q) return plates;
    return plates.filter(
      (p) =>
        p.plateNumberNorm.includes(q) ||
        (p.vehicleType ?? '').toUpperCase().includes(query.trim().toUpperCase()),
    );
  }, [plates, query]);

  const selected = plates.find((p) => p.plateNumber === value);

  return (
    // `modal` is required, not cosmetic: Radix portals the content to <body>,
    // outside the Dialog's scroll-lock container, and react-remove-scroll then
    // cancels every wheel/touch event over it — the list becomes unscrollable.
    // Modal mode gives the popover its own lock, so its list scrolls again.
    <Popover
      modal
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setQuery('');
          // focus the search box once the popover has mounted
          requestAnimationFrame(() => searchRef.current?.focus());
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className="w-full justify-between font-normal aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected
              ? `${selected.plateNumber}${selected.vehicleType ? ` · ${selected.vehicleType}` : ''}`
              : loading
                ? 'Memuat…'
                : 'Pilih plat terdaftar'}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari plat…"
            aria-label="Cari plat"
            className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <ul className="max-h-64 overflow-y-auto overscroll-contain p-1" role="listbox">
          {filtered.length === 0 && (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">
              {loading ? 'Memuat…' : 'Plat tidak ditemukan'}
            </li>
          )}
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={p.plateNumber === value}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                  p.plateNumber === value && 'bg-accent',
                )}
                onClick={() => {
                  onChange(p.plateNumber);
                  setOpen(false);
                }}
              >
                <Check
                  aria-hidden
                  className={cn(
                    'size-4 shrink-0',
                    p.plateNumber === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="truncate">
                  {p.plateNumber}
                  {p.vehicleType ? (
                    <span className="text-muted-foreground"> · {p.vehicleType}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
