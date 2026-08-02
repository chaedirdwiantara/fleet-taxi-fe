import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortOrder } from '../types';

// Shared header row for the Cicilan and COP tables: same click-to-sort idiom,
// same arrow affordances. Generic over the sort field so each table keeps its
// own literal union — an unsortable column simply omits `sort`.

export type SortColumn<F extends string> = {
  label: string;
  sort?: F;
  /** Right-align (money/counts) and mirror the arrow to the leading edge. */
  numeric?: boolean;
  /** Extra header classes — e.g. `hidden xl:table-cell` for a secondary
   * column. Apply the SAME class to the matching cell or the row shifts. */
  className?: string;
};

export function SortableHeaderRow<F extends string>({
  columns,
  sortBy,
  sortOrder,
  onSort,
}: {
  columns: Array<SortColumn<F>>;
  sortBy: F;
  sortOrder: SortOrder;
  onSort: (field: F) => void;
}) {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {columns.map((col) => (
          <TableHead
            key={col.label}
            className={cn('whitespace-nowrap', col.numeric && 'text-right', col.className)}
          >
            {col.sort ? (
              <button
                type="button"
                onClick={() => onSort(col.sort!)}
                className={cn(
                  'inline-flex items-center gap-1 hover:text-foreground',
                  col.numeric && 'flex-row-reverse',
                  sortBy === col.sort && 'text-foreground',
                )}
              >
                {col.label}
                {sortBy === col.sort ? (
                  sortOrder === 'asc' ? (
                    <ArrowUp className="size-3.5" aria-label="urut naik" />
                  ) : (
                    <ArrowDown className="size-3.5" aria-label="urut turun" />
                  )
                ) : (
                  <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />
                )}
              </button>
            ) : (
              col.label
            )}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
