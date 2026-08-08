import { MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonitoringMode } from '@/features/fleet/searchSchema';
import { SOURCE_LEGEND, STATUS_LEGEND, statusTextClass } from '../lib/sourceTone';

// Two channels, two rows — a cell says both things at once, so the legend has to
// teach both. Row 1: what the background means (income source). Row 2: what the
// colour of the figure means (Gojek Monitoring's status legend, verbatim). Each
// row wraps on its own, so at 375px they stack instead of interleaving.
export function AllFleetLegend({ mode }: { mode: MonitoringMode }) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-3 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="font-semibold text-muted-foreground">Latar = sumber:</span>
        {SOURCE_LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={cn('inline-block size-3.5 rounded-sm border', item.swatch)} />
            <span className="font-medium">{item.label}</span>
            {item.hint && <span className="text-muted-foreground">({item.hint})</span>}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-2">
        <span className="font-semibold text-muted-foreground">Warna angka = status setoran:</span>
        {STATUS_LEGEND.map((item) => (
          <span key={item.tone} className={cn('font-semibold', statusTextClass(item.tone))}>
            {item.label}
          </span>
        ))}
        <span className="text-muted-foreground">
          — sama persis dengan halaman <span className="font-medium">Gojek</span>. Grab dan Rental
          tidak punya target harian, jadi angkanya memakai warna sumbernya.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MousePointerClick className="size-3.5" aria-hidden />
          Klik sel untuk rincian transaksinya
        </span>
        {mode === 'driver' && (
          <span>
            Omset Rental masuk baris <span className="font-medium">Tanpa driver</span> — Rental
            Monitoring tidak mencatat driver.
          </span>
        )}
      </div>
    </div>
  );
}
