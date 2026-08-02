import type { LucideIcon } from 'lucide-react';
import { CalendarDays, Clock, Landmark, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumberID, formatRupiah } from '@/lib/money';
import type { RentalNettByType, RentalSummary } from '../types';

// Gradient stat cards in the GradientStat (fleet) idiom, but with a plain
// count card + a caption on the unpaid card — GradientStat always formats
// rupiah, so these mirror its markup instead of reusing it directly.
type StatCard = {
  label: string;
  display: string;
  caption?: string;
  icon: LucideIcon;
  gradient: string; // tailwind `from-… to-…`
};

function GradientCard({ label, display, caption, icon: Icon, gradient }: StatCard) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-5 text-white shadow-sm`}
    >
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{display}</p>
      {caption && <p className="mt-1 text-xs opacity-90">{caption}</p>}
      <Icon className="absolute -right-2 -bottom-3 size-20 opacity-20" aria-hidden />
    </div>
  );
}

export function RentalSummarySection({
  summary,
  nettByType,
}: {
  summary: RentalSummary;
  nettByType: RentalNettByType[];
}) {
  const cards: StatCard[] = [
    {
      label: 'Transaksi Rental',
      display: formatNumberID(summary.totalTransactions),
      icon: CalendarDays,
      gradient: 'from-blue-500 to-blue-700',
    },
    {
      label: 'Total Kotor (Paid)',
      display: formatRupiah(summary.paidGross),
      icon: Wallet,
      gradient: 'from-emerald-500 to-green-700',
    },
    {
      label: 'Total COGS (Paid)',
      display: formatRupiah(summary.paidCogs),
      icon: TrendingDown,
      gradient: 'from-rose-500 to-red-700',
    },
    {
      label: 'Nett Total (Paid)',
      display: formatRupiah(summary.paidNettProfit),
      icon: TrendingUp,
      gradient: 'from-teal-500 to-cyan-700',
    },
    {
      label: 'Belum Dibayar',
      display: formatRupiah(summary.unpaidGross),
      caption: `${summary.unpaidTransactions} transaksi belum dibayar`,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
    },
  ];

  // Shown only once VAT is actually in play — a non-PKP partner would just
  // read "Rp 0" forever. It sits apart from the revenue cards on purpose:
  // this money is collected FOR the state, it is not income.
  if (summary.paidPpn > 0 || summary.unpaidPpn > 0) {
    cards.push({
      label: 'PPN Terutang',
      display: formatRupiah(summary.paidPpn),
      caption: `Total tagihan ${formatRupiah(summary.paidTotalBilled)}`,
      icon: Landmark,
      gradient: 'from-violet-500 to-purple-700',
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-3">
        {cards.map((card) => (
          <GradientCard key={card.label} {...card} />
        ))}
      </div>
      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Nett per Tipe</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {nettByType.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data paid</p>
          ) : (
            <ul className="divide-y">
              {nettByType.map((row) => (
                <li
                  key={row.cogsType}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{row.cogsType}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {row.count} transaksi
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-semibold tabular-nums ${
                      row.nett >= 0 ? 'text-emerald-600' : 'text-destructive'
                    }`}
                  >
                    {formatRupiah(row.nett)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
