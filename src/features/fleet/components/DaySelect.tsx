import { useState } from 'react';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { daysInMonth, MONTH_NAMES_ID } from '@/lib/datetime';

// Monday-first weekday header (id-ID convention).
const WEEKDAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/** Column offset (0..6, Monday-first) of the month's day 1. */
function firstWeekdayOffset(month: number, year: number): number {
  return (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
}

// Tanggal (day-of-month) filter — a mini calendar-grid popover beside the
// Bulan/Tahun selects. No selection = whole month; picking a day narrows the
// summary cards to the cumulative position at that day and highlights it in
// the daily chart. Clicking the selected day again (or "Semua Tanggal")
// clears the filter. A `day` beyond the selected month's length renders as
// unselected.
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
  const [open, setOpen] = useState(false);
  const dim = daysInMonth(month, year);
  const selected = day && day <= dim ? day : undefined;
  const offset = firstWeekdayOffset(month, year);

  const pick = (d?: number) => {
    onChange(d);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label="Tanggal"
          className={cn('font-normal', selected && 'font-medium')}
        >
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          {selected ? `Tanggal ${selected}` : 'Semua Tanggal'}
          <ChevronDown className="size-4 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">
            {MONTH_NAMES_ID[month - 1]} {year}
          </p>
          {selected && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => pick(undefined)}
            >
              <X className="size-3.5" aria-hidden />
              Semua Tanggal
            </Button>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS_ID.map((w) => (
            <span key={w} className="py-1 text-xs font-medium text-muted-foreground">
              {w}
            </span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={`pad-${i}`} aria-hidden />
          ))}
          {Array.from({ length: dim }, (_, i) => i + 1).map((d) => (
            <Button
              key={d}
              variant="ghost"
              size="sm"
              aria-label={`Tanggal ${d}`}
              aria-pressed={d === selected}
              className={cn(
                'size-9 p-0 text-sm font-normal tabular-nums',
                d === selected &&
                  'bg-primary font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
              )}
              onClick={() => pick(d === selected ? undefined : d)}
            >
              {d}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
