import { useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Landmark,
  PieChart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GradientStat, type GradientStatDef } from '@/features/fleet/components/GradientStat';
import { formatNumberID, formatRupiah } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { RentalNettByType, RentalSummary } from '../types';

// Two stacked bands rather than a 2/3 + 1/3 split: "Nett per Tipe" grows by one
// row per COGS preset the partner uses, so as a side column it out-grew the
// stat cards next to it and left a widening hole under them. Full width, it
// grows sideways into columns instead — and the stat cards get the extra width,
// which is what keeps a nine-digit rupiah from clipping.
//
// The breakdown is also capped: the top NETT_PREVIEW earners are shown and the
// rest fold behind a toggle, so the band's height stops depending on how many
// vehicle types the partner happens to have.
const NETT_PREVIEW = 6;

// 9-digit rupiah (Rp 134.779.040) at the GradientStat default clips in a
// third-of-a-row card, so the ramp starts one step lower and only reaches the
// default once the card is wide enough to hold it.
const VALUE_CLASS = 'text-xl sm:text-2xl xl:text-3xl';

export function RentalSummarySection({
  summary,
  nettByType,
}: {
  summary: RentalSummary;
  nettByType: RentalNettByType[];
}) {
  const cards: GradientStatDef[] = [
    {
      label: 'Transaksi Rental',
      value: summary.totalTransactions,
      formatValue: formatNumberID, // a count, not money
      icon: CalendarDays,
      gradient: 'from-blue-500 to-blue-700',
      valueClassName: VALUE_CLASS,
    },
    {
      label: 'Total Kotor (Paid)',
      value: summary.paidGross,
      icon: Wallet,
      gradient: 'from-emerald-500 to-green-700',
      valueClassName: VALUE_CLASS,
    },
    {
      label: 'Total COGS (Paid)',
      value: summary.paidCogs,
      icon: TrendingDown,
      gradient: 'from-rose-500 to-red-700',
      valueClassName: VALUE_CLASS,
    },
    {
      label: 'Nett Total (Paid)',
      value: summary.paidNettProfit,
      icon: TrendingUp,
      gradient: 'from-teal-500 to-cyan-700',
      valueClassName: VALUE_CLASS,
    },
    {
      label: 'Belum Dibayar',
      value: summary.unpaidGross,
      note: `${formatNumberID(summary.unpaidTransactions)} transaksi belum dibayar`,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
      valueClassName: VALUE_CLASS,
    },
  ];

  // Shown only once VAT is actually in play — a non-PKP partner would just
  // read "Rp 0" forever. It sits apart from the revenue cards on purpose:
  // this money is collected FOR the state, it is not income.
  if (summary.paidPpn > 0 || summary.unpaidPpn > 0) {
    cards.push({
      label: 'PPN Terutang',
      value: summary.paidPpn,
      note: `Total tagihan ${formatRupiah(summary.paidTotalBilled)}`,
      icon: Landmark,
      gradient: 'from-violet-500 to-purple-700',
      valueClassName: VALUE_CLASS,
    });
  }

  return (
    <div className="space-y-4">
      {/* Three per row keeps 6 cards as two even rows at every desktop width —
          GradientStatRow's own 4-up grid would leave a ragged 4 + 2. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <GradientStat key={card.label} {...card} />
        ))}
      </div>
      <NettByTypePanel rows={nettByType} />
    </div>
  );
}

function NettByTypePanel({ rows }: { rows: RentalNettByType[] }) {
  const [expanded, setExpanded] = useState(false);
  // Rows arrive sorted by nett desc from the backend, so the preview is the
  // top earners — the part worth seeing without opening anything.
  const hidden = Math.max(rows.length - NETT_PREVIEW, 0);
  const visible = expanded ? rows : rows.slice(0, NETT_PREVIEW);
  const total = rows.reduce((sum, row) => sum + row.nett, 0);

  return (
    <Card className="gap-0 py-4">
      <CardHeader className="flex flex-row flex-wrap items-center gap-2 px-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <PieChart className="size-4 text-muted-foreground" aria-hidden />
          Nett per Tipe
        </CardTitle>
        {rows.length > 0 && (
          <>
            <Badge variant="secondary">{formatNumberID(rows.length)} tipe</Badge>
            <span className="ml-auto text-sm text-muted-foreground">
              Total{' '}
              <span className={cn('font-semibold tabular-nums', nettToneClass(total))}>
                {formatRupiah(total)}
              </span>
            </span>
          </>
        )}
      </CardHeader>
      <CardContent className="px-4">
        {rows.length === 0 ? (
          <EmptyState
            icon={PieChart}
            title="Belum ada data paid"
            description="Nett per tipe dihitung dari transaksi yang sudah dibayar pada periode ini."
            className="py-8"
          />
        ) : (
          <>
            {/* Tiles in columns, not one long list: the panel widens instead of
                growing downward as the partner adds vehicle types, and a tile
                grid has no ragged hairline when the last row is half-empty. */}
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((row) => (
                <li
                  key={row.cogsType}
                  className="flex items-baseline justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium" title={row.cogsType}>
                      {row.cogsType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumberID(row.count)} transaksi
                    </span>
                  </span>
                  <span
                    className={cn('shrink-0 font-semibold tabular-nums', nettToneClass(row.nett))}
                  >
                    {formatRupiah(row.nett)}
                  </span>
                </li>
              ))}
            </ul>
            {hidden > 0 && (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((open) => !open)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              >
                {expanded ? (
                  <>
                    Tampilkan {formatNumberID(NETT_PREVIEW)} teratas saja
                    <ChevronUp className="size-3.5" aria-hidden />
                  </>
                ) : (
                  <>
                    Tampilkan {formatNumberID(hidden)} tipe lainnya
                    <ChevronDown className="size-3.5" aria-hidden />
                  </>
                )}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** A negative nett is a loss — it reads as destructive, not as revenue. */
const nettToneClass = (nett: number) =>
  nett >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive';
