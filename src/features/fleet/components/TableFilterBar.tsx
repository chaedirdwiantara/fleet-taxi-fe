import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/shared/SearchInput';
import { MultiSelectFilter } from './MultiSelectFilter';
import { ViewModeToggle } from './ViewModeToggle';
import type { FleetSearch, MonitoringMode } from '../searchSchema';

// Every control that shapes the monitoring TABLE and nothing else: the reading
// mode (By Plat / By Driver) plus the two filters. Deliberately rendered as the
// last thing before the pivot — on the partner screens four summary cards and a
// chart sit above, and a control placed up there would change a table the reader
// cannot see. Here the result appears directly underneath.
//
// All three are applied server-side (?mode= / ?q= / ?vehicleType=): the backend
// re-derives the rows, TOTAL HARI INI and the Summary block, so nothing on
// screen can disagree. Summary cards and charts come from the summary endpoint,
// which is plate-based and unfiltered — said in the note below, because a reader
// who filters to one driver would otherwise read the cards as his.

export const TABLE_FILTER_DEBOUNCE_MS = 350;

type Props = {
  mode: MonitoringMode;
  q: string | undefined;
  vehicleType: string[];
  /** From the payload's `availableVehicleTypes` — every Type present this period. */
  typeOptions: string[];
  onChange: (patch: Partial<FleetSearch>) => void;
  /** Rows currently rendered, shown only while a filter is narrowing them. */
  resultCount?: number;
  /** Noun for the count: "kendaraan", "driver", "baris". */
  resultNoun?: string;
  /** Whether the surface below shows aggregate cards/charts that stay unfiltered. */
  hasUnfilteredAggregates?: boolean;
};

export function TableFilterBar({
  mode,
  q,
  vehicleType,
  typeOptions,
  onChange,
  resultCount,
  resultNoun = 'baris',
  hasUnfilteredAggregates = false,
}: Props) {
  // Debounce the text into the URL (and therefore the query key). When the URL
  // value changes from elsewhere — back button, deep link, Bersihkan — reconcile
  // the draft during render (React's derived-state pattern).
  const [draft, setDraft] = useState(q ?? '');
  const [lastUrlQ, setLastUrlQ] = useState(q);
  if (q !== lastUrlQ) {
    setLastUrlQ(q);
    setDraft(q ?? '');
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = draft.trim() || undefined;
      if (next !== q) onChange({ q: next });
    }, TABLE_FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, q, onChange]);

  const isFiltered = Boolean(q) || vehicleType.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {/* First: it decides WHAT a row is, which the two filters then narrow. */}
        <ViewModeToggle mode={mode} onChange={(next) => onChange({ mode: next })} />
        <SearchInput
          value={draft}
          onChange={setDraft}
          placeholder="Cari plat atau driver…"
          label="Cari plat atau driver"
          className="w-full sm:w-64"
        />
        <MultiSelectFilter
          label="Tipe Kendaraan"
          options={typeOptions}
          selected={vehicleType}
          onChange={(next) => onChange({ vehicleType: next })}
          emptyText="Belum ada tipe pada periode ini"
          className="w-full sm:w-52"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => onChange({ q: undefined, vehicleType: [] })}
          >
            <X aria-hidden /> Bersihkan filter
          </Button>
        )}
        {isFiltered && resultCount !== undefined && (
          <span className="text-xs text-muted-foreground sm:ml-auto">
            {resultCount} {resultNoun} cocok
          </span>
        )}
      </div>
      {isFiltered && hasUnfilteredAggregates && (
        <p className="text-xs text-muted-foreground">
          Filter berlaku pada tabel di bawah · kartu ringkasan &amp; grafik tetap seluruh armada.
        </p>
      )}
    </div>
  );
}
