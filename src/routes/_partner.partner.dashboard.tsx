import { createFileRoute } from '@tanstack/react-router';
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
import { useDashboardQuery } from '@/features/partner/hooks';
import { formatRupiah } from '@/lib/money';

export const Route = createFileRoute('/_partner/partner/dashboard')({
  component: PartnerDashboardPage,
});

const STATUS_COLORS: Record<string, string> = {
  submitted: 'var(--color-chart-1)',
  completed: 'var(--color-chart-2)',
  cancelled: 'var(--color-chart-5)',
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 text-2xl font-semibold tabular-nums">{value}</CardContent>
    </Card>
  );
}

function PartnerDashboardPage() {
  const dashboard = useDashboardQuery();

  if (dashboard.isPending) {
    return <p className="text-sm text-muted-foreground">Memuat dashboard…</p>;
  }
  if (dashboard.isError) {
    return (
      <p className="text-sm text-destructive">Gagal memuat: {dashboard.error.message}</p>
    );
  }

  const d = dashboard.data;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Total order" value={d.totalOrders.toLocaleString('id-ID')} />
        <MetricCard label="Order bulan ini" value={d.ordersThisMonth.toLocaleString('id-ID')} />
        <MetricCard label="Pendapatan bulan ini" value={formatRupiah(d.revenueThisMonth)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Order per hari</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.ordersByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(8)}
                  fontSize={11}
                />
                <YAxis allowDecimals={false} fontSize={11} width={28} />
                <Tooltip />
                <Bar dataKey="count" name="Order" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Order per status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={d.ordersByStatus}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  label={({ name, value }) => `${name} (${value})`}
                  fontSize={11}
                >
                  {d.ordersByStatus.map((s) => (
                    <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? 'var(--color-chart-3)'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
