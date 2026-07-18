import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { currentYearWIB, MONTH_NAMES_ID } from '@/lib/datetime';
import type { RentalSearch } from '../searchSchema';
import type { RentalSortBy, RentalSortOrder } from '../types';

const ALL_REGIONS = '__all';

const SORT_OPTIONS: ReadonlyArray<readonly [RentalSortBy, string]> = [
  ['date', 'Tanggal'],
  ['duration', 'Durasi'],
  ['status', 'Status Bayar'],
  ['omset', 'Omset'],
  ['cogs', 'COGS'],
];

// Auto-apply filter bar — every change patches the URL search params.
export function RentalFilterBar({
  search,
  regions,
  onPatch,
}: {
  search: RentalSearch;
  regions: string[];
  onPatch: (patch: Partial<RentalSearch>) => void;
}) {
  const years = Array.from({ length: 4 }, (_, i) => currentYearWIB() - 2 + i);
  // keep a stale URL region selectable so the Select never shows a blank value
  const regionItems =
    search.region && !regions.includes(search.region) ? [...regions, search.region] : regions;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div className="space-y-1.5">
        <Label htmlFor="rental-month">Bulan</Label>
        <Select value={String(search.month)} onValueChange={(v) => onPatch({ month: Number(v) })}>
          <SelectTrigger id="rental-month" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES_ID.map((name, i) => (
              <SelectItem key={name} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rental-year">Tahun</Label>
        <Select value={String(search.year)} onValueChange={(v) => onPatch({ year: Number(v) })}>
          <SelectTrigger id="rental-year" className="w-full">
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
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rental-region">Region</Label>
        <Select
          value={search.region ?? ALL_REGIONS}
          onValueChange={(v) => onPatch({ region: v === ALL_REGIONS ? undefined : v })}
        >
          <SelectTrigger id="rental-region" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_REGIONS}>Semua Region</SelectItem>
            {regionItems.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rental-sort">Urutkan</Label>
        <Select value={search.sortBy} onValueChange={(v) => onPatch({ sortBy: v as RentalSortBy })}>
          <SelectTrigger id="rental-sort" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rental-order">Order</Label>
        <Select
          value={search.sortOrder}
          onValueChange={(v) => onPatch({ sortOrder: v as RentalSortOrder })}
        >
          <SelectTrigger id="rental-order" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">ASC</SelectItem>
            <SelectItem value="desc">DESC</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
