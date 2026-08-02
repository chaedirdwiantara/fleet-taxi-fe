import { Scale, Target, TrendingDown, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { GradientStatRow } from '@/features/fleet/components/GradientStat';
import { formatNumberID } from '@/lib/money';
import type { CopSummary } from '../types';

/**
 * Programme headline: the four money figures owners ask for — total kewajiban,
 * yang sudah tertarik, outstanding, dan gap terhadap jadwal. Counts ride along
 * as captions because GradientStat always renders its value as rupiah.
 */
// A 60-month programme runs into the hundreds of millions, so these cards ask
// for a tighter value size than the fleet default.
const VALUE_CLASS = 'text-xl sm:text-2xl';

export function CopSummaryCards({ summary }: { summary: CopSummary }) {
  const driverNote = `${formatNumberID(summary.driverCount)} driver · ${formatNumberID(
    summary.ruleCount,
  )} program`;

  return (
    <GradientStatRow
      cards={[
        {
          label: 'Total Kewajiban',
          value: summary.totalTarget,
          icon: Target,
          gradient: 'from-blue-500 to-sky-400',
          note: `${driverNote} — seluruh tenor`,
          valueClassName: VALUE_CLASS,
        },
        {
          label: 'Sudah Tertarik',
          value: summary.totalPaid,
          icon: Wallet,
          gradient: 'from-emerald-500 to-green-400',
          note: `${formatNumberID(summary.totalWithdrawals)} kali penarikan`,
          valueClassName: VALUE_CLASS,
        },
        {
          label: 'Outstanding Cicilan',
          value: summary.totalRemaining,
          icon: Scale,
          gradient: 'from-orange-500 to-amber-400',
          note: `${formatNumberID(summary.berjalanCount)} berjalan · ${formatNumberID(
            summary.lunasCount,
          )} lunas`,
          valueClassName: VALUE_CLASS,
        },
        {
          label: 'Gap vs Jadwal',
          value: summary.totalGap,
          icon: TrendingDown,
          gradient: 'from-rose-500 to-red-500',
          note:
            summary.totalGap > 0
              ? 'Kurang tertarik dari hari aktif yang sudah berjalan'
              : 'Semua program sesuai atau di depan jadwal',
          valueClassName: VALUE_CLASS,
        },
      ]}
    />
  );
}

/** Same footprint as the loaded row so the page does not jump. */
export function CopSummarySkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[124px] rounded-xl" />
      ))}
    </div>
  );
}
