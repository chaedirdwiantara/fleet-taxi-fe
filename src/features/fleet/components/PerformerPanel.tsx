import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/money';
import { usePerformersQuery } from '../hooks/useFleetQueries';
import type { Performer } from '../types';

function PerformerTable({
  title,
  icon,
  accent,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  items: Performer[];
}) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground [&>th]:px-2 [&>th]:pb-1">
                <th className="w-8">#</th>
                <th>Driver</th>
                <th>Plate</th>
                <th className="text-right">Total Setoran</th>
                <th className="text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p, i) => (
                <tr key={p.key} className="border-t [&>td]:px-2 [&>td]:py-1.5">
                  <td className="text-muted-foreground">{i + 1}</td>
                  <td className="font-medium">{p.driverName}</td>
                  <td className="text-muted-foreground">{p.vehicle}</td>
                  <td className="text-right tabular-nums">{formatRupiah(p.totalDeduction)}</td>
                  <td className={`text-right font-semibold tabular-nums ${accent}`}>
                    {formatRupiah(p.outstanding)}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PerformerPanel({
  platform,
  month,
  year,
}: {
  platform: 'gojek' | 'grab';
  month: number;
  year: number;
}) {
  const performers = usePerformersQuery({ platform, month, year });

  if (performers.isPending) {
    return <p className="text-sm text-muted-foreground">Memuat performer…</p>;
  }
  if (performers.isError) {
    return <p className="text-sm text-destructive">Gagal memuat performer.</p>;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <PerformerTable
        title="Top 10 Over-Performing"
        icon={<TrendingUp className="size-4 text-emerald-600" aria-hidden />}
        accent="text-emerald-600"
        items={performers.data.top}
      />
      <PerformerTable
        title="Top 10 Under-Performing"
        icon={<TrendingDown className="size-4 text-red-600" aria-hidden />}
        accent="text-red-600"
        items={performers.data.bottom}
      />
    </div>
  );
}
