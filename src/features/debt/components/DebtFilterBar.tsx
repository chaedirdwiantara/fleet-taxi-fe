import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DebtFilters, DriverStatus } from '../types';
import type { DebtSearch } from '../searchSchema';

// Radix Select disallows empty-string item values, so "Semua …" uses a
// sentinel that maps back to `undefined` (= no filter) in the URL.
const ALL = '__all';

export function DebtFilterBar({
  search,
  options,
  onPatch,
}: {
  search: DebtSearch;
  options: DebtFilters | undefined;
  onPatch: (patch: Partial<DebtSearch>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Status Driver</span>
        <Select
          value={search.status ?? ALL}
          onValueChange={(v) =>
            onPatch({ status: v === ALL ? undefined : (v as DriverStatus), page: 1 })
          }
        >
          <SelectTrigger className="w-full" aria-label="Status Driver">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Status</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="nonaktif">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Cabang</span>
        <Select
          value={search.cabang ?? ALL}
          onValueChange={(v) => onPatch({ cabang: v === ALL ? undefined : v, page: 1 })}
        >
          <SelectTrigger className="w-full" aria-label="Cabang">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Cabang</SelectItem>
            {(options?.cabang ?? []).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Koordinator</span>
        <Select
          value={search.koordinator ?? ALL}
          onValueChange={(v) => onPatch({ koordinator: v === ALL ? undefined : v, page: 1 })}
        >
          <SelectTrigger className="w-full" aria-label="Koordinator">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Koordinator</SelectItem>
            {(options?.koordinator ?? []).map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
