import { Badge } from '@/components/ui/badge';
import { formatDateTimeWIB } from '@/lib/datetime';
import { SOURCE_LABELS, type DepositReturnStatus, type DriverSource } from '../types';

// Shared status-badge maps — same color family as rental monitoring:
// emerald = positive, sky/amber = in progress, rose = negative,
// outline = neutral. All tints carry dark: variants.

const EMERALD =
  'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
const SKY = 'border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400';
const AMBER =
  'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
const ROSE = 'border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400';

/** Origin of a synced roster row: Gojek = emerald, Grab = sky, Manual = outline. */
export function SourceBadge({ source }: { source: DriverSource }) {
  const label = SOURCE_LABELS[source];
  if (source === 'gojek') return <Badge className={EMERALD}>{label}</Badge>;
  if (source === 'grab') return <Badge className={SKY}>{label}</Badge>;
  return <Badge variant="outline">{label}</Badge>;
}

/** Aktif / Nonaktif / Resign — one badge for the whole lifecycle column. */
export function LifecycleBadge({
  isActive,
  resignedAt,
}: {
  isActive: boolean;
  resignedAt: string | null;
}) {
  if (resignedAt) return <Badge className={ROSE}>Resign</Badge>;
  return isActive ? (
    <Badge className={EMERALD}>Aktif</Badge>
  ) : (
    <Badge variant="outline">Nonaktif</Badge>
  );
}

/**
 * Deposit-return state of a resigned driver: 'approved' = returned (emerald),
 * anything else = not yet returned (amber). `decidedAt` comes from the
 * detail-only `depositReturnDecidedAt` field.
 */
export function DepositReturnBadge({
  status,
  decidedAt,
}: {
  status: DepositReturnStatus;
  decidedAt: string | null;
}) {
  return status === 'approved' ? (
    <Badge className={EMERALD}>
      Dikembalikan{decidedAt ? ` · ${formatDateTimeWIB(decidedAt)}` : ''}
    </Badge>
  ) : (
    <Badge className={AMBER}>Belum dikembalikan</Badge>
  );
}
