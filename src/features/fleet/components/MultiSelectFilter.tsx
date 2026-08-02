import { ChevronDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Checkbox dropdown over a list of server-supplied options (rental partners,
// vehicle types). The options always come from the payload's `available*`
// arrays, which the backend computes BEFORE applying the filters — so the list
// never shrinks as the reader picks.

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  emptyText = 'Tidak ada opsi',
  className,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyText?: string;
  className?: string;
}) {
  const toggle = (option: string, checked: boolean) => {
    const set = new Set(selected);
    if (checked) set.add(option);
    else set.delete(option);
    onChange([...set].sort());
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('justify-between gap-1 font-normal', className)}>
          <span className="truncate">{label}</span>
          <span className="flex shrink-0 items-center gap-1">
            {selected.length > 0 && <Badge variant="secondary">{selected.length}</Badge>}
            <ChevronDown className="size-4 opacity-60" aria-hidden />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        {options.length === 0 && (
          <p className="px-2 py-1 text-sm text-muted-foreground">{emptyText}</p>
        )}
        {/* long lists (a fleet can register many types) scroll instead of
            pushing the Bersihkan action off-screen */}
        <div className="max-h-64 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selected.includes(option)}
                onCheckedChange={(checked) => toggle(option, checked === true)}
              />
              <span className="truncate" title={option}>
                {option}
              </span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => onChange([])}>
            <X aria-hidden /> Bersihkan
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
