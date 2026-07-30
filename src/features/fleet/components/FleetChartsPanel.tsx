import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateRangeID, formatDateShortID, formatDayMonthID } from '@/lib/datetime';
import { formatRupiah, formatRupiahCompact } from '@/lib/money';
import type { FleetCharts } from '../types';

const PARTNER_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

/**
 * Charts narrowed to a Tanggal range — structurally the range block of either
 * summary payload, so callers pass `summary.range` straight through. Keyed by
 * DATE rather than day-of-month, because a range may cross months and two 25ths
 * would otherwise collide.
 */
export type RangeCharts = {
  fromDate: string;
  toDate: string;
  charts: {
    daily: { date: string; total: number }[];
    byPartner: { partner: string; total: number }[];
  };
};

// Dashboard charts synced to the monitoring grid (same month/year): daily
// setoran trend + setoran split per rental partner. Mirrors the Recharts
// style of the partner dashboard. The partner portal hides the per-partner
// split (a partner only ever sees itself) via showPartnerSplit={false}.
// With `range` the panel plots that range's own series instead of dimming days
// of a month it may no longer describe.
export function FleetChartsPanel({
  charts,
  showPartnerSplit = true,
  range,
}: {
  charts: FleetCharts;
  showPartnerSplit?: boolean;
  range?: RangeCharts;
}) {
  const daily = range
    ? range.charts.daily.map((point) => ({
        label: formatDayMonthID(point.date),
        title: formatDateShortID(point.date),
        total: point.total,
      }))
    : charts.daily.map((point) => ({
        label: String(point.day),
        title: `Tanggal ${point.day}`,
        total: point.total,
      }));
  const byPartner = range ? range.charts.byPartner : charts.byPartner;
  const periodLabel = range ? ` · ${formatDateRangeID(range.fromDate, range.toDate)}` : '';

  return (
    <div className={showPartnerSplit ? 'grid gap-3 lg:grid-cols-3' : 'grid gap-3'}>
      <Card className={showPartnerSplit ? 'lg:col-span-2' : undefined}>
        <CardHeader>
          <CardTitle className="text-sm">Setoran per hari{periodLabel}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" fontSize={11} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                fontSize={11}
                width={44}
                tickFormatter={(v: number) => formatRupiahCompact(v)}
              />
              <Tooltip
                formatter={(v) => [formatRupiah(Number(v)), 'Setoran']}
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload as { title?: string } | undefined)?.title ?? ''
                }
              />
              <Bar
                dataKey="total"
                name="Setoran"
                radius={[3, 3, 0, 0]}
                fill="var(--color-chart-1)"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {showPartnerSplit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Setoran per rental partner{periodLabel}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byPartner}
                  dataKey="total"
                  nameKey="partner"
                  innerRadius={45}
                  outerRadius={78}
                  paddingAngle={2}
                  label={({ name }) => String(name)}
                  fontSize={11}
                >
                  {byPartner.map((entry, i) => (
                    <Cell key={entry.partner} fill={PARTNER_COLORS[i % PARTNER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [formatRupiah(Number(v)), 'Setoran']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
