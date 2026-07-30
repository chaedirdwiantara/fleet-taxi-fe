import { useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  addDaysISO,
  daysInMonth,
  daysInRangeISO,
  diffDaysISO,
  firstWeekdayOffset,
  formatDateRangeID,
  formatDateShortID,
  monthEndISO,
  monthStartISO,
  MONTH_NAMES_ID,
  parseISODate,
  toISODate,
  todayWIB,
  type DateRangeValue,
} from '@/lib/datetime';

// Monday-first weekday header (id-ID convention).
const WEEKDAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/** Default cap — mirrors the backend's MAX_RANGE_DAYS, which returns 400 above it. */
const DEFAULT_MAX_DAYS = 92;

type MonthCursor = { month: number; year: number };

function nextMonth({ month, year }: MonthCursor): MonthCursor {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
}

function prevMonth({ month, year }: MonthCursor): MonthCursor {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}

/**
 * Date-range filter for the fleet dashboards (admin + partner, Gojek + Grab).
 *
 * The range may cross months — it navigates independently of the Bulan/Tahun
 * selects beside it, which keep driving the monthly table. Picking is the usual
 * two-click gesture: first click sets the start, the second closes the range,
 * and hovering in between previews it.
 */
export function DateRangePicker({
  value,
  onChange,
  month,
  year,
  maxDays = DEFAULT_MAX_DAYS,
  className,
}: {
  value?: DateRangeValue;
  onChange: (value?: DateRangeValue) => void;
  /** Period the dashboard is on — where the calendar opens when nothing is picked. */
  month: number;
  year: number;
  maxDays?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<MonthCursor>({ month, year });
  // The first click of a pick; while set, the second click closes the range.
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const gridsRef = useRef<HTMLDivElement>(null);

  const today = todayWIB();

  const openAt = (next: boolean) => {
    setOpen(next);
    if (next) {
      const from = value ? parseISODate(value.dateFrom) : { month, year };
      setCursor({ month: from.month, year: from.year });
      setAnchor(null);
      setHovered(null);
      setFocused(value?.dateFrom ?? null);
    }
  };

  const commit = (range?: DateRangeValue) => {
    onChange(range);
    setAnchor(null);
    setHovered(null);
    setOpen(false);
  };

  const pick = (date: string) => {
    if (anchor === null) {
      setAnchor(date);
      setHovered(date);
      setFocused(date);
      return;
    }
    const [dateFrom, dateTo] = anchor <= date ? [anchor, date] : [date, anchor];
    commit({ dateFrom, dateTo });
  };

  const applyPreset = (dateFrom: string, dateTo: string) => {
    const from = parseISODate(dateFrom);
    setCursor({ month: from.month, year: from.year });
    commit({ dateFrom, dateTo });
  };

  // While picking, anything beyond the cap would be rejected by the API — so it
  // is not offered in the first place.
  const outOfReach = (date: string) =>
    anchor !== null && Math.abs(diffDaysISO(anchor, date)) + 1 > maxDays;

  // The span being previewed: the committed range when idle, the live one while
  // picking. Drives both the fill and the footer caption.
  const preview = useMemo<DateRangeValue | undefined>(() => {
    if (anchor === null) return value;
    const other = hovered ?? anchor;
    return anchor <= other
      ? { dateFrom: anchor, dateTo: other }
      : { dateFrom: other, dateTo: anchor };
  }, [anchor, hovered, value]);

  const moveFocus = (from: string, days: number) => {
    const next = addDaysISO(from, days);
    const { month: m, year: y } = parseISODate(next);
    // Keep the moved day visible: the two panes show `cursor` and the month after.
    const visible = m === cursor.month && y === cursor.year;
    const onSecondPane = (() => {
      const after = nextMonth(cursor);
      return m === after.month && y === after.year;
    })();
    if (!visible && !onSecondPane) setCursor({ month: m, year: y });
    setFocused(next);
    // The button only exists after the pane re-renders.
    requestAnimationFrame(() => {
      gridsRef.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus();
    });
  };

  const onGridKeyDown = (event: React.KeyboardEvent) => {
    const current = focused ?? value?.dateFrom ?? toISODate(cursor.year, cursor.month, 1);
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (event.key in steps) {
      event.preventDefault();
      moveFocus(current, steps[event.key]);
      return;
    }
    const { month: m, year: y, day } = parseISODate(current);
    if (event.key === 'Home') {
      event.preventDefault();
      moveFocus(current, 1 - day);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveFocus(current, daysInMonth(m, y) - day);
    }
  };

  const label = value ? formatDateRangeID(value.dateFrom, value.dateTo) : 'Semua Tanggal';

  const panes = [cursor, nextMonth(cursor)];

  return (
    <Popover open={open} onOpenChange={openAt}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={value ? `Rentang tanggal: ${label}` : 'Rentang tanggal'}
          className={cn('justify-start font-normal', value && 'font-medium', className)}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-auto size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-auto max-w-[calc(100vw-2rem)] p-3"
      >
        <div className="flex flex-wrap gap-1.5 pb-3">
          <PresetChip label="Hari ini" onClick={() => applyPreset(today, today)} />
          <PresetChip label="7 hari" onClick={() => applyPreset(addDaysISO(today, -6), today)} />
          <PresetChip label="30 hari" onClick={() => applyPreset(addDaysISO(today, -29), today)} />
          <PresetChip
            label="Bulan lalu"
            onClick={() => {
              const p = prevMonth({ month, year });
              applyPreset(monthStartISO(p.month, p.year), monthEndISO(p.month, p.year));
            }}
          />
        </div>

        <div className="mb-2 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Bulan sebelumnya"
            onClick={() => setCursor(prevMonth(cursor))}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <p className="text-sm font-medium">
            {MONTH_NAMES_ID[cursor.month - 1]} {cursor.year}
            <span className="hidden md:inline">
              {' '}
              – {MONTH_NAMES_ID[panes[1].month - 1]} {panes[1].year}
            </span>
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Bulan berikutnya"
            onClick={() => setCursor(nextMonth(cursor))}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>

        <div
          ref={gridsRef}
          className="flex gap-4"
          onKeyDown={onGridKeyDown}
          onMouseLeave={() => anchor !== null && setHovered(anchor)}
        >
          {panes.map((pane, index) => (
            <MonthGrid
              key={`${pane.year}-${pane.month}`}
              // Two panes make a cross-month range one gesture; on a phone the
              // second would not fit, and the ‹ › nav covers it instead.
              className={index === 1 ? 'hidden md:block' : undefined}
              pane={pane}
              today={today}
              range={preview}
              anchor={anchor}
              focused={focused}
              isDisabled={outOfReach}
              onPick={pick}
              onHover={(date) => anchor !== null && setHovered(date)}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {anchor !== null
              ? `Mulai ${formatDateShortID(anchor)} · pilih tanggal akhir (maks ${maxDays} hari)`
              : value
                ? `${formatDateRangeID(value.dateFrom, value.dateTo)} · ${daysInRangeISO(value.dateFrom, value.dateTo)} hari`
                : 'Pilih tanggal mulai'}
          </p>
          {(value || anchor !== null) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
              onClick={() => commit(undefined)}
            >
              <X className="size-3.5" aria-hidden />
              Semua Tanggal
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PresetChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" className="h-7 px-2.5 text-xs" onClick={onClick}>
      {label}
    </Button>
  );
}

function MonthGrid({
  pane,
  today,
  range,
  anchor,
  focused,
  isDisabled,
  onPick,
  onHover,
  className,
}: {
  pane: MonthCursor;
  today: string;
  range?: DateRangeValue;
  anchor: string | null;
  focused: string | null;
  isDisabled: (date: string) => boolean;
  onPick: (date: string) => void;
  onHover: (date: string) => void;
  className?: string;
}) {
  const dim = daysInMonth(pane.month, pane.year);
  const offset = firstWeekdayOffset(pane.month, pane.year);
  // One tab stop per pane: arrows move within the calendar (roving tabindex).
  const tabTarget =
    focused &&
    parseISODate(focused).month === pane.month &&
    parseISODate(focused).year === pane.year
      ? focused
      : toISODate(pane.year, pane.month, 1);

  return (
    <div className={className}>
      {/* No per-pane heading: the nav above already names the visible month(s). */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS_ID.map((w) => (
          <span key={w} className="py-1 text-xs font-medium text-muted-foreground">
            {w}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} aria-hidden />
        ))}
        {Array.from({ length: dim }, (_, i) => i + 1).map((day) => {
          const date = toISODate(pane.year, pane.month, day);
          const inRange = !!range && date >= range.dateFrom && date <= range.dateTo;
          const isStart = range?.dateFrom === date;
          const isEnd = range?.dateTo === date;
          const isEdge = isStart || isEnd;
          const disabled = isDisabled(date);
          return (
            <Button
              key={date}
              variant="ghost"
              size="sm"
              data-date={date}
              tabIndex={date === tabTarget ? 0 : -1}
              disabled={disabled}
              aria-label={formatDateShortID(date)}
              aria-pressed={inRange}
              onClick={() => onPick(date)}
              onMouseEnter={() => onHover(date)}
              onFocus={() => onHover(date)}
              className={cn(
                'size-9 rounded-none p-0 text-sm font-normal tabular-nums',
                date === today && !isEdge && 'font-semibold text-primary',
                // The span reads as one block: soft fill between, solid ends.
                inRange && !isEdge && 'bg-primary/10 text-foreground hover:bg-primary/20',
                isStart && 'rounded-l-md',
                isEnd && 'rounded-r-md',
                !inRange && 'rounded-md',
                isEdge &&
                  'bg-primary font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                // A half-open pick is a pending state, not a result.
                anchor === date && !range?.dateTo && 'ring-2 ring-ring',
              )}
            >
              {day}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
