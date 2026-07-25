import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { daysInMonth } from '@/lib/datetime';

const ALL_DAYS = 'all';

// Tanggal (day-of-month) filter — sits beside the Bulan/Tahun selects.
// "Semua" (undefined) = whole month; a day narrows the summary cards to the
// cumulative position at that day and highlights it in the daily chart.
// A `day` beyond the selected month's length renders as "Semua".
export function DaySelect({
  day,
  month,
  year,
  onChange,
}: {
  day?: number;
  month: number;
  year: number;
  onChange: (day?: number) => void;
}) {
  const dim = daysInMonth(month, year);
  const value = day && day <= dim ? String(day) : ALL_DAYS;
  return (
    <Select value={value} onValueChange={(v) => onChange(v === ALL_DAYS ? undefined : Number(v))}>
      <SelectTrigger className="w-32" aria-label="Tanggal">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_DAYS}>Semua Tanggal</SelectItem>
        {Array.from({ length: dim }, (_, i) => i + 1).map((d) => (
          <SelectItem key={d} value={String(d)}>
            Tanggal {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
