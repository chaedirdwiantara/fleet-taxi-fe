import { CELL_LEGEND, toneClass } from '../lib/thresholds';
import type { MonitoringMode } from '../searchSchema';

// Color legend mirroring the legacy "Legenda Warna & Keterangan".
export function CellLegend({ mode = 'plate' }: { mode?: MonitoringMode }) {
  // Exception markers describe a vehicle's state, so the backend omits them in
  // driver mode — the legend must not promise colors the table cannot show.
  const items =
    mode === 'driver'
      ? CELL_LEGEND.filter((item) => item.tone !== 'bebas' && item.tone !== 'nonop')
      : CELL_LEGEND;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border bg-card p-3 text-xs">
      <span className="font-semibold text-muted-foreground">Legenda:</span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className={`inline-block size-3.5 rounded-sm border ${item.tone === 'empty' ? 'bg-white dark:bg-slate-800' : toneClass(item.tone)}`}
          />
          {item.label}
        </span>
      ))}
      {mode === 'driver' && (
        <span className="text-muted-foreground">
          Penanda Bebas Setoran / Tidak Beroperasi hanya ada di mode By Plat — status itu milik
          kendaraan, bukan orang.
        </span>
      )}
    </div>
  );
}
