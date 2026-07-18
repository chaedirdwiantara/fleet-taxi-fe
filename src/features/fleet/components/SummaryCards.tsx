import { Scale, Target, UserX, Wallet } from 'lucide-react';
import { GradientStatRow } from './GradientStat';
import type { GlobalSummary } from '../types';

// Gojek monthly summary — Total Setoran / Due / Outstanding / Driver Keluar
// (legacy cards). Outstanding partitions: exited plates report on their own
// card, not in Total Outstanding.
export function SummaryCards({ summary }: { summary: GlobalSummary }) {
  return (
    <GradientStatRow
      cards={[
        { label: 'Total Setoran', value: summary.totalDeduction, icon: Wallet, gradient: 'from-blue-500 to-sky-400' },
        { label: 'Total Target (Due)', value: summary.totalDue, icon: Target, gradient: 'from-emerald-500 to-green-400' },
        { label: 'Total Outstanding / Gap', value: summary.totalOutstanding, icon: Scale, gradient: 'from-orange-500 to-amber-400' },
        {
          label: 'Outstanding Driver Keluar',
          value: summary.outstandingDriverKeluar,
          icon: UserX,
          gradient: 'from-red-500 to-rose-400',
          sub: `${summary.exitedCount} driver tidak lagi muncul di import`,
        },
      ]}
    />
  );
}
