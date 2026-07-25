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
import { formatRupiah, formatRupiahCompact } from '@/lib/money';
import type { FleetCharts } from '../types';

const PARTNER_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

// Dashboard charts synced to the monitoring grid (same month/year): daily
// setoran trend + setoran split per rental partner. Mirrors the Recharts
// style of the partner dashboard. The partner portal hides the per-partner
// split (a partner only ever sees itself) via showPartnerSplit={false}.
// `selectedDay` (Tanggal filter) keeps the whole month visible but dims every
// bar except the selected day's.
export function FleetChartsPanel({
  charts,
  showPartnerSplit = true,
  selectedDay,
}: {
  charts: FleetCharts;
  showPartnerSplit?: boolean;
  selectedDay?: number;
}) {
  return (
    <div className={showPartnerSplit ? 'grid gap-3 lg:grid-cols-3' : 'grid gap-3'}>
      <Card className={showPartnerSplit ? 'lg:col-span-2' : undefined}>
        <CardHeader>
          <CardTitle className="text-sm">Setoran per hari</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.daily} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" fontSize={11} tickLine={false} />
              <YAxis
                fontSize={11}
                width={44}
                tickFormatter={(v: number) => formatRupiahCompact(v)}
              />
              <Tooltip
                formatter={(v) => [formatRupiah(Number(v)), 'Setoran']}
                labelFormatter={(d) => `Tanggal ${d}`}
              />
              <Bar dataKey="total" name="Setoran" radius={[3, 3, 0, 0]}>
                {charts.daily.map((d) => (
                  <Cell
                    key={d.day}
                    fill="var(--color-chart-1)"
                    fillOpacity={selectedDay == null || d.day === selectedDay ? 1 : 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {showPartnerSplit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Setoran per rental partner</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.byPartner}
                  dataKey="total"
                  nameKey="partner"
                  innerRadius={45}
                  outerRadius={78}
                  paddingAngle={2}
                  label={({ name }) => String(name)}
                  fontSize={11}
                >
                  {charts.byPartner.map((entry, i) => (
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
