import { useState } from 'react';
import { Scale, Target, UserX, Wallet } from 'lucide-react';
import { GradientStatRow } from './GradientStat';
import { ExitedDriversDialog } from './ExitedDriversDialog';
import type { ExitedDriver, GlobalSummary } from '../types';

// Gojek monthly summary — Total Setoran / Due / Outstanding / Driver Keluar
// (legacy cards). Outstanding partitions: exited plates report on their own
// card, not in Total Outstanding. When `exitedDrivers` is provided the red
// card is clickable and opens the per-driver debt list.
export function SummaryCards({
  summary,
  exitedDrivers,
  lastImportDate,
}: {
  summary: GlobalSummary;
  exitedDrivers?: ExitedDriver[];
  lastImportDate?: string | null;
}) {
  const [showExited, setShowExited] = useState(false);

  return (
    <>
      <GradientStatRow
        cards={[
          {
            label: 'Total Setoran',
            value: summary.totalDeduction,
            icon: Wallet,
            gradient: 'from-blue-500 to-sky-400',
          },
          {
            label: 'Total Target (Due)',
            value: summary.totalDue,
            icon: Target,
            gradient: 'from-emerald-500 to-green-400',
          },
          {
            label: 'Total Outstanding / Gap',
            value: summary.totalOutstanding,
            icon: Scale,
            gradient: 'from-orange-500 to-amber-400',
          },
          {
            label: 'Outstanding Driver Keluar',
            // `?? 0` keeps the card sane if it renders against a backend that
            // predates these fields (e.g. during a FE-ahead-of-BE deploy window).
            value: summary.outstandingDriverKeluar ?? 0,
            icon: UserX,
            gradient: 'from-red-500 to-rose-400',
            sub: `${summary.exitedCount ?? 0} driver tidak lagi muncul di import${exitedDrivers ? ' · klik untuk detail' : ''}`,
            ...(exitedDrivers ? { onClick: () => setShowExited(true) } : {}),
          },
        ]}
      />
      {showExited && exitedDrivers && (
        <ExitedDriversDialog
          drivers={exitedDrivers}
          lastImportDate={lastImportDate}
          onClose={() => setShowExited(false)}
        />
      )}
    </>
  );
}
