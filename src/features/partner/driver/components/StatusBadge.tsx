import { Badge } from '@/components/ui/badge';
import type { DepositStatus, RegistrationStatus } from '../types';

// Shared status-badge maps — same color family as rental monitoring:
// emerald = approved/positive, sky/amber = in progress, rose = rejected,
// outline = neutral. All tints carry dark: variants.

const EMERALD = 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
const SKY = 'border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400';
const AMBER = 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
const ROSE = 'border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400';

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  if (status === 'approved') return <Badge className={EMERALD}>Disetujui</Badge>;
  if (status === 'rejected') return <Badge className={ROSE}>Ditolak</Badge>;
  return <Badge className={SKY}>Menunggu Verifikasi</Badge>;
}

export function DepositStatusBadge({ status }: { status: DepositStatus }) {
  switch (status) {
    case 'approved':
      return <Badge className={EMERALD}>Disetujui</Badge>;
    case 'rejected':
      return <Badge className={ROSE}>Ditolak</Badge>;
    case 'waiting':
      return <Badge className={AMBER}>Menunggu Approval</Badge>;
    default:
      return <Badge variant="outline">Menunggu Deposit</Badge>;
  }
}

export function DepositReturnStatusBadge({ status }: { status: DepositStatus }) {
  switch (status) {
    case 'approved':
      return <Badge className={EMERALD}>Dikembalikan</Badge>;
    case 'rejected':
      return <Badge className={ROSE}>Ditolak</Badge>;
    case 'waiting':
      return <Badge className={AMBER}>Menunggu Approval</Badge>;
    default:
      return <Badge variant="outline">Belum Diajukan</Badge>;
  }
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className={EMERALD}>Aktif</Badge>
  ) : (
    <Badge variant="outline">Nonaktif</Badge>
  );
}
