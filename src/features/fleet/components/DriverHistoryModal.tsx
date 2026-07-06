import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FleetRow } from '../types';

// Legacy "Driver History" modal — the list of drivers that held this plate.
export function DriverHistoryModal({ row, onClose }: { row: FleetRow; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Histori Driver — {row.plateRaw || 'Tanpa Plat'}</DialogTitle>
        </DialogHeader>
        <ol className="divide-y text-sm">
          {row.driverHistory.length === 0 && (
            <li className="py-3 text-center text-muted-foreground">Tidak ada histori.</li>
          )}
          {row.driverHistory.map((name, i) => (
            <li key={`${name}-${i}`} className="flex gap-3 py-2">
              <span className="w-6 text-muted-foreground">{i + 1}.</span>
              <span>{name}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
