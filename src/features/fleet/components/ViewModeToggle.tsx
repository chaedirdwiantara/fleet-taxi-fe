import { Car, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonitoringMode } from '../searchSchema';

// Reading mode of a monitoring table: one row per plate, or per driver. Used
// identically by All Fleet Monitoring, Gojek and Grab (partner + admin) so the
// control always sits in the same place and reads the same way.
//
// A radiogroup rather than two buttons: the two options are mutually exclusive
// states of one setting, which is what arrow-key navigation and screen readers
// expect. The mode itself lives in the URL (searchSchema) — the server returns
// genuinely different rows, and the link stays shareable.

const OPTIONS: { value: MonitoringMode; label: string; icon: typeof Car }[] = [
  { value: 'plate', label: 'By Plat', icon: Car },
  { value: 'driver', label: 'By Driver', icon: User },
];

export function ViewModeToggle({
  mode,
  onChange,
  className,
}: {
  mode: MonitoringMode;
  onChange: (mode: MonitoringMode) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Mode tabel"
      className={cn(
        'inline-flex w-full rounded-md border bg-muted p-0.5 sm:w-auto',
        'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-none sm:flex-none',
              active
                ? 'bg-background font-medium text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <option.icon className="size-4 shrink-0" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
