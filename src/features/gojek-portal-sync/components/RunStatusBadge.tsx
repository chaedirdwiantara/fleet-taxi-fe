import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, type SyncStatus } from '../types';

// Success uses the same emerald treatment as the import panel's "done" note
// (a green token does not exist); the other two map to badge variants.
export function RunStatusBadge({ status, className }: { status: SyncStatus; className?: string }) {
  if (status === 'success') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-200',
          className,
        )}
      >
        {STATUS_LABELS.success}
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge variant="destructive" className={className}>
        {STATUS_LABELS.failed}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={className}>
      <Loader2 className="animate-spin" aria-hidden />
      {STATUS_LABELS.running}
    </Badge>
  );
}
