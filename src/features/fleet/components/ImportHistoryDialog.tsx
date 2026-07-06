import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Platform } from '@/lib/query-client';
import { ImportHistoryTable } from './ImportHistoryTable';

// The legacy top-level "Riwayat Import (Rollback)" affordance (amber, fa-history),
// available on both the Gojek and Grab monitoring headers.
export function ImportHistoryDialog({ platform }: { platform: Platform }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70"
        >
          <History aria-hidden /> Riwayat Import (Rollback)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Riwayat Import — {platform === 'gojek' ? 'Gojek' : 'Grab'}</DialogTitle>
          <DialogDescription>
            Rollback membatalkan seluruh baris dari sebuah file import. Gunakan jika salah upload
            atau ada duplikasi data.
          </DialogDescription>
        </DialogHeader>
        <ImportHistoryTable platform={platform} />
      </DialogContent>
    </Dialog>
  );
}
