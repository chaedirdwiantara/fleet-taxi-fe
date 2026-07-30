import { MousePointerClick } from 'lucide-react';
import type { MonitoringMode } from '@/features/fleet/searchSchema';
import { CELL_LEGEND } from '../lib/sourceTone';

// What the cell colors mean. Same shape as the Gojek grid's CellLegend so the
// two screens read alike.
export function AllFleetLegend({ mode }: { mode: MonitoringMode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border bg-card p-3 text-xs">
      <span className="font-semibold text-muted-foreground">Legenda:</span>
      {CELL_LEGEND.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`inline-block size-3.5 rounded-sm border ${item.swatch}`} />
          <span className="font-medium">{item.label}</span>
          {item.hint && <span className="text-muted-foreground">({item.hint})</span>}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <MousePointerClick className="size-3.5" aria-hidden />
        Klik sel untuk rincian transaksinya
      </span>
      {mode === 'driver' && (
        <span className="text-muted-foreground">
          Omset Rental masuk baris <span className="font-medium">Tanpa driver</span> — Rental
          Monitoring tidak mencatat driver.
        </span>
      )}
    </div>
  );
}
