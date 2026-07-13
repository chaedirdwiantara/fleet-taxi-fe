import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateTimeWIB } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import { useDecideDepositReturn, useRequestDepositReturn } from '../hooks';
import type { ResignationDetail } from '../types';
import { DocumentUploadCard } from './DocumentUploadCard';
import { DepositReturnStatusBadge } from './StatusBadge';

// Deposit-return flow on the resignation detail: upload bukti pengembalian →
// Ajukan Pengembalian (status `waiting`) → approve/reject decision.
export function DepositReturnPanel({ detail }: { detail: ResignationDetail }) {
  const request = useRequestDepositReturn(detail.id);
  const decide = useDecideDepositReturn(detail.id);
  const [note, setNote] = useState('');

  const proof = detail.documents.find((d) => d.kind === 'deposit_return_proof');
  const proofUploaded = proof?.status === 'uploaded';
  const settled = detail.depositReturnStatus === 'approved';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Pengembalian Deposit</h3>
        <DepositReturnStatusBadge status={detail.depositReturnStatus} />
      </div>

      <p className="text-sm">
        Deposit driver:{' '}
        <span className="font-semibold tabular-nums">{formatRupiah(detail.depositAmount)}</span>
      </p>

      <DocumentUploadCard
        driverId={detail.id}
        kind="deposit_return_proof"
        document={proof}
        readOnly={settled}
      />

      {detail.depositReturnDecidedAt && (
        <p className="text-xs text-muted-foreground">
          Keputusan pengembalian: {formatDateTimeWIB(detail.depositReturnDecidedAt)}
        </p>
      )}

      {!settled && detail.depositReturnStatus !== 'waiting' && (
        <div className="space-y-2">
          <Button
            disabled={!proofUploaded || request.isPending}
            onClick={() => request.mutate()}
          >
            {request.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Ajukan Pengembalian
          </Button>
          {!proofUploaded && (
            <p className="text-xs text-muted-foreground">
              Unggah bukti pengembalian terlebih dahulu sebelum mengajukan.
            </p>
          )}
          {request.isError && (
            <p className="text-sm text-destructive" role="alert">
              {request.error.message}
            </p>
          )}
        </div>
      )}

      {detail.depositReturnStatus === 'waiting' && (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label htmlFor="return-note">Catatan (saat menolak)</Label>
            <Input
              id="return-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bukti tidak sesuai"
              maxLength={250}
            />
          </div>
          <div className="flex gap-2">
            <Button disabled={decide.isPending} onClick={() => decide.mutate({ action: 'approve' })}>
              {decide.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Setujui Pengembalian
            </Button>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={decide.isPending}
              onClick={() => decide.mutate({ action: 'reject', note: note.trim() || undefined })}
            >
              Tolak
            </Button>
          </div>
          {decide.isError && (
            <p className="text-sm text-destructive" role="alert">
              {decide.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
