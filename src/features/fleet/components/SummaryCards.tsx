import { useState } from 'react';
import { Scale, Target, UserX, Wallet } from 'lucide-react';
import { formatRupiah } from '@/lib/money';
import { GradientStatRow } from './GradientStat';
import { ExitedDriversDialog } from './ExitedDriversDialog';
import type { DayFilterSummary, ExitedDriver, GlobalSummary } from '../types';

// "Bulan ini: +Rp X (nambah) / −Rp X (berkurang) / Rp 0 (tetap)" — the selected
// month's delta of the cumulative outstanding (legacy dashboard card caption).
// With a Tanggal filter the delta covers only days 1..D of the month.
function monthDeltaLabel(delta: number, day?: number): string {
  const scope = day ? `Bulan ini (s/d tgl ${day})` : 'Bulan ini';
  if (delta > 0) return `${scope}: +${formatRupiah(delta)} (nambah)`;
  if (delta < 0) return `${scope}: −${formatRupiah(Math.abs(delta))} (berkurang)`;
  return `${scope}: ${formatRupiah(0)} (tetap)`;
}

// Gojek monthly summary — Total Setoran / Due / Outstanding / Driver Keluar
// (legacy cards). Outstanding partitions: exited plates report on their own
// card, not in Total Outstanding. When `exitedDrivers` is provided the red
// card is clickable and opens the per-driver debt list. When `dayFilter` is
// present (Tanggal filter active) the first three cards show the cumulative
// position at that day, plus the day's own setoran; the Driver Keluar card is
// all-time by definition and never changes.
export function SummaryCards({
  summary,
  dayFilter,
  exitedDrivers,
  lastImportDate,
}: {
  summary: GlobalSummary;
  dayFilter?: DayFilterSummary;
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
            value: dayFilter ? dayFilter.cumulative.totalDeduction : summary.totalDeduction,
            icon: Wallet,
            gradient: 'from-blue-500 to-sky-400',
            ...(dayFilter
              ? {
                  sub: `Tanggal ${dayFilter.day}: ${formatRupiah(dayFilter.selectedDay.totalDeduction)}`,
                  note: `Kumulatif s/d tanggal ${dayFilter.day}`,
                }
              : {}),
          },
          {
            label: 'Total Target (Due)',
            value: dayFilter ? dayFilter.cumulative.totalDue : summary.totalDue,
            icon: Target,
            gradient: 'from-emerald-500 to-green-400',
            note: dayFilter
              ? `Target s/d tanggal ${dayFilter.day}`
              : 'Dari baris due yang terimpor — hari tanpa data tidak ditagih',
          },
          {
            // Headline = accumulated outstanding from the first month of data up
            // to the selected month (or day D); the caption shows the month's
            // own delta over the same window.
            label: 'Total Outstanding / Gap',
            value: dayFilter ? dayFilter.cumulative.totalOutstanding : summary.totalOutstanding,
            icon: Scale,
            gradient: 'from-orange-500 to-amber-400',
            // `?? 0` keeps the caption sane against a backend that predates the
            // field (FE-ahead-of-BE deploy window).
            sub: dayFilter
              ? monthDeltaLabel(dayFilter.cumulative.totalOutstandingMonth, dayFilter.day)
              : monthDeltaLabel(summary.totalOutstandingMonth ?? 0),
            note: 'Hanya driver aktif — driver keluar dihitung terpisah',
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
