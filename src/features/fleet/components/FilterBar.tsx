import { useEffect, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { currentYearWIB } from '@/lib/datetime';
import type { FleetSearch } from '../searchSchema';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type FilterBarProps = {
  search: FleetSearch;
  rentalPartnerOptions: string[];
  onChange: (patch: Partial<FleetSearch>) => void;
};

// Filters write to the URL search params → Query key → grid fetch (§5).
// No client-side filtering of the pivot; the server returns the filtered grid.
export function FilterBar({ search, rentalPartnerOptions, onChange }: FilterBarProps) {
  const years = Array.from({ length: 6 }, (_, i) => currentYearWIB() - 4 + i);

  // debounce the plate text input before it hits the URL/query key;
  // when the URL value changes from elsewhere (back button, deep link),
  // reconcile the draft during render (React's derived-state pattern).
  const [plateDraft, setPlateDraft] = useState(search.plate ?? '');
  const [lastUrlPlate, setLastUrlPlate] = useState(search.plate);
  if (search.plate !== lastUrlPlate) {
    setLastUrlPlate(search.plate);
    setPlateDraft(search.plate ?? '');
  }
  useEffect(() => {
    const t = setTimeout(() => {
      const next = plateDraft.trim() || undefined;
      if (next !== search.plate) onChange({ plate: next });
    }, 300);
    return () => clearTimeout(t);
  }, [plateDraft, search.plate, onChange]);

  const togglePartner = (partner: string, checked: boolean) => {
    const set = new Set(search.rentalPartner);
    if (checked) set.add(partner);
    else set.delete(partner);
    onChange({ rentalPartner: [...set].sort() });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={String(search.month)}
        onValueChange={(v) => onChange({ month: Number(v) })}
      >
        <SelectTrigger className="w-36" aria-label="Bulan">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, i) => (
            <SelectItem key={name} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(search.year)} onValueChange={(v) => onChange({ year: Number(v) })}>
        <SelectTrigger className="w-24" aria-label="Tahun">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1">
            Rental partner
            {search.rentalPartner.length > 0 && (
              <Badge variant="secondary">{search.rentalPartner.length}</Badge>
            )}
            <ChevronDown className="size-4 opacity-60" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          {rentalPartnerOptions.length === 0 && (
            <p className="px-2 py-1 text-sm text-muted-foreground">Tidak ada opsi</p>
          )}
          {rentalPartnerOptions.map((partner) => (
            <label
              key={partner}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={search.rentalPartner.includes(partner)}
                onCheckedChange={(checked) => togglePartner(partner, checked === true)}
              />
              {partner}
            </label>
          ))}
          {search.rentalPartner.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 w-full"
              onClick={() => onChange({ rentalPartner: [] })}
            >
              <X aria-hidden /> Bersihkan
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <Input
        value={plateDraft}
        onChange={(e) => setPlateDraft(e.target.value)}
        placeholder="Cari plat…"
        aria-label="Cari plat"
        className="w-40"
      />
    </div>
  );
}
