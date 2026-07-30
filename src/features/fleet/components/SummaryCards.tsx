import { useState } from 'react';
import { Scale, Target, UserX, Wallet } from 'lucide-react';
import { formatDateRangeID, formatDateShortID, formatRangeNoteID } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import { GradientStatRow } from './GradientStat';
import { ExitedDriversDialog } from './ExitedDriversDialog';
import type { ExitedDriver, GlobalSummary, RangeSummary } from '../types';

// "<scope>: +Rp X (nambah) / −Rp X (berkurang) / Rp 0 (tetap)" — how much the
// period moved the cumulative outstanding balance (legacy dashboard caption).
function deltaLabel(delta: number, scope: string): string {
  if (delta > 0) return `${scope}: +${formatRupiah(delta)} (nambah)`;
  if (delta < 0) return `${scope}: −${formatRupiah(Math.abs(delta))} (berkurang)`;
  return `${scope}: ${formatRupiah(0)} (tetap)`;
}

// Gojek summary — Total Setoran / Due / Outstanding / Driver Keluar (legacy
// cards). Outstanding partitions: exited plates report on their own card, not in
// Total Outstanding. When `exitedDrivers` is provided the red card is clickable
// and opens the per-driver debt list.
//
// With a Tanggal range active the first two cards become PERIOD figures — what
// the range itself collected and billed — while Outstanding stays a BALANCE: the
// debt as it stood at the range's closing date, captioned with how much the
// range moved it. The Driver Keluar card is all-time by definition and never
// changes.
export function SummaryCards({
  summary,
  range,
  exitedDrivers,
  lastImportDate,
}: {
  summary: GlobalSummary;
  range?: RangeSummary;
  exitedDrivers?: ExitedDriver[];
  lastImportDate?: string | null;
}) {
  const [showExited, setShowExited] = useState(false);
  const rangeLabel = range ? formatDateRangeID(range.fromDate, range.toDate) : '';

  return (
    <>
      <GradientStatRow
        cards={[
          {
            label: 'Total Setoran',
            value: range ? range.totalDeduction : summary.totalDeduction,
            icon: Wallet,
            gradient: 'from-blue-500 to-sky-400',
            ...(range ? { note: formatRangeNoteID(range.fromDate, range.toDate, range.days) } : {}),
          },
          {
            label: 'Total Target (Due)',
            value: range ? range.totalDue : summary.totalDue,
            icon: Target,
            gradient: 'from-emerald-500 to-green-400',
            note: range
              ? `Ditagih dalam rentang ${rangeLabel}`
              : 'Dari baris due yang terimpor — hari tanpa data tidak ditagih',
          },
          {
            // Headline = accumulated outstanding from the first month of data up
            // to the selected month, or to the range's closing date; the caption
            // shows how much the period itself moved that balance.
            label: 'Total Outstanding / Gap',
            value: range ? range.outstandingAsOf : summary.totalOutstanding,
            icon: Scale,
            gradient: 'from-orange-500 to-amber-400',
            // `?? 0` keeps the caption sane against a backend that predates the
            // field (FE-ahead-of-BE deploy window).
            sub: range
              ? deltaLabel(range.outstandingDelta, 'Rentang ini')
              : deltaLabel(summary.totalOutstandingMonth ?? 0, 'Bulan ini'),
            note: range
              ? `Posisi s/d ${formatDateShortID(range.toDate)} — hanya driver aktif`
              : 'Hanya driver aktif — driver keluar dihitung terpisah',
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
