import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { currentYearWIB } from '@/lib/datetime';
import { MultiSelectFilter } from './MultiSelectFilter';
import type { FleetSearch } from '../searchSchema';

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

type FilterBarProps = {
  search: FleetSearch;
  rentalPartnerOptions: string[];
  onChange: (patch: Partial<FleetSearch>) => void;
};

// Period + cross-partner scope of the admin grids. Filters write to the URL
// search params → Query key → grid fetch (§5). No client-side filtering of the
// pivot; the server returns the filtered grid.
//
// The free-text search and the Tipe Kendaraan filter live in TableFilterBar
// instead: they narrow the table, so they belong immediately next to it.
export function FilterBar({ search, rentalPartnerOptions, onChange }: FilterBarProps) {
  const years = Array.from({ length: 6 }, (_, i) => currentYearWIB() - 4 + i);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={String(search.month)} onValueChange={(v) => onChange({ month: Number(v) })}>
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

      <MultiSelectFilter
        label="Rental partner"
        options={rentalPartnerOptions}
        selected={search.rentalPartner}
        onChange={(next) => onChange({ rentalPartner: next })}
        className="w-52"
      />
    </div>
  );
}
