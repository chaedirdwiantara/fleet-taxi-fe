import { AlertCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatRupiah } from '@/lib/money';
import { monthYearLabelID } from '@/lib/datetime';
import type { DriverActivity } from '../types';

// Legacy "Driver Activity & Status" center — per-day active/inactive counts,
// total deduction, and the list of drivers who haven't deposited that day.
export function DriverActivityPanel({
  activity,
  month,
  year,
  onDayChange,
}: {
  activity: DriverActivity;
  month: number;
  year: number;
  onDayChange: (day: number) => void;
}) {
  return (
    <Card className="gap-3 border-l-4 border-l-violet-500 py-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="size-4 text-violet-500" aria-hidden />
          Driver Activity &amp; Status
        </CardTitle>
        <Select value={String(activity.day)} onValueChange={(v) => onDayChange(Number(v))}>
          <SelectTrigger size="sm" className="w-40" aria-label="Filter hari">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {activity.availableDays.map((d) => (
              <SelectItem key={d} value={String(d)}>
                Tanggal {d} {monthYearLabelID(month, year)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="grid gap-4 px-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="grid grid-cols-2 gap-3 self-start">
          <Stat label="Driver Aktif" value={activity.activeDrivers} tone="text-emerald-600" />
          <Stat label="Tidak Aktif" value={activity.inactiveDrivers} tone="text-red-600" />
          <div className="col-span-2 rounded-lg border p-3 text-center">
            <div className="text-xl font-bold tabular-nums text-blue-600">
              {formatRupiah(activity.selectedDayTotalDeduction)}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Total Deduction
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-600">
            <AlertCircle className="size-4" aria-hidden />
            Belum Setor / Tidak Aktif ({activity.inactiveList.length})
          </h4>
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {activity.inactiveList.map((d, i) => (
              <li key={`${d.name}-${i}`} className="flex items-center justify-between gap-2 border-b py-1.5 text-sm last:border-0">
                <span className="min-w-0">
                  <span className="font-medium">{d.name}</span>
                  <span className="ml-2 text-xs italic text-muted-foreground">{d.status}</span>
                </span>
                <Badge variant={d.vehicle === 'Tanpa Plat' ? 'secondary' : 'outline'}>{d.vehicle}</Badge>
              </li>
            ))}
            {activity.inactiveList.length === 0 && (
              <li className="py-4 text-center text-sm text-muted-foreground">
                Semua driver aktif pada tanggal ini.
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${tone}`}>{value.toLocaleString('id-ID')}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
