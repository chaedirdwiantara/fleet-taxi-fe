import { Scale, Target, UserX, Wallet } from 'lucide-react';
import { formatRupiah } from '@/lib/money';
import { GradientStatRow } from './GradientStat';
import type { GlobalSummary } from '../types';

// "Bulan ini: +Rp X (nambah) / −Rp X (berkurang) / Rp 0 (tetap)" — the selected
// month's delta of the cumulative outstanding (legacy dashboard card caption).
function monthDeltaLabel(delta: number): string {
  if (delta > 0) return `Bulan ini: +${formatRupiah(delta)} (nambah)`;
  if (delta < 0) return `Bulan ini: −${formatRupiah(Math.abs(delta))} (berkurang)`;
  return `Bulan ini: ${formatRupiah(0)} (tetap)`;
}

// Gojek monthly summary — Total Setoran / Due / Outstanding / Driver Keluar
// (legacy cards). Outstanding partitions: exited plates report on their own
// card, not in Total Outstanding.
export function SummaryCards({ summary }: { summary: GlobalSummary }) {
  return (
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
          // Headline = accumulated outstanding from the first month of data up
          // to the selected month; the caption shows this month's own delta.
          label: 'Total Outstanding / Gap',
          value: summary.totalOutstanding,
          icon: Scale,
          gradient: 'from-orange-500 to-amber-400',
          // `?? 0` keeps the caption sane against a backend that predates the
          // field (FE-ahead-of-BE deploy window).
          sub: monthDeltaLabel(summary.totalOutstandingMonth ?? 0),
          note: 'Hanya driver aktif — driver keluar dihitung terpisah',
        },
        {
          label: 'Outstanding Driver Keluar',
          // `?? 0` keeps the card sane if it renders against a backend that
          // predates these fields (e.g. during a FE-ahead-of-BE deploy window).
          value: summary.outstandingDriverKeluar ?? 0,
          icon: UserX,
          gradient: 'from-red-500 to-rose-400',
          sub: `${summary.exitedCount ?? 0} driver tidak lagi muncul di import`,
        },
      ]}
    />
  );
}
