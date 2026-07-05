import { CELL_LEGEND, toneClass } from '../lib/thresholds';

// Color legend mirroring the legacy "Legenda Warna & Keterangan".
export function CellLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border bg-card p-3 text-xs">
      <span className="font-semibold text-muted-foreground">Legenda:</span>
      {CELL_LEGEND.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className={`inline-block size-3.5 rounded-sm border ${item.tone === 'empty' ? 'bg-white dark:bg-slate-800' : toneClass(item.tone)}`}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
