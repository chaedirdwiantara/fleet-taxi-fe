import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { currentYearWIB, MONTH_NAMES_ID } from '@/lib/datetime';

// Shared month + year period selector (Asia/Jakarta calendar).
export function MonthYearPicker({
  month,
  year,
  onMonth,
  onYear,
}: {
  month: number;
  year: number;
  onMonth: (m: number) => void;
  onYear: (y: number) => void;
}) {
  const years = Array.from({ length: 6 }, (_, i) => currentYearWIB() - 4 + i);
  return (
    <div className="flex gap-2">
      <Select value={String(month)} onValueChange={(v) => onMonth(Number(v))}>
        <SelectTrigger className="w-36" aria-label="Bulan">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES_ID.map((name, i) => (
            <SelectItem key={name} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => onYear(Number(v))}>
        <SelectTrigger className="w-24" aria-label="Tahun">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
