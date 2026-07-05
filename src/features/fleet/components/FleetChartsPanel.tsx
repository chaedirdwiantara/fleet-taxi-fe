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
// style of the partner dashboard.
export function FleetChartsPanel({ charts }: { charts: FleetCharts }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="lg:col-span-2">
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
              <Bar dataKey="total" name="Setoran" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
    </div>
  );
}
