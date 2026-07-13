import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateTimeWIB } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import { useDecideDeposit, useSetDeposit } from '../hooks';
import type { RegistrationDetail } from '../types';
import { DocumentUploadCard } from './DocumentUploadCard';
import { DepositStatusBadge } from './StatusBadge';

// Deposit flow on the verification page: upload bukti deposit → Ajukan
// (records the amount, status `waiting`) → approve/reject decision. Amounts
// are integer rupiah typed by the user; the FE never derives them.
export function DepositPanel({ detail }: { detail: RegistrationDetail }) {
  const setDeposit = useSetDeposit(detail.id);
  const decide = useDecideDeposit(detail.id);

  const [amount, setAmount] = useState(detail.depositAmount > 0 ? String(detail.depositAmount) : '');
  const [note, setNote] = useState('');

  const proof = detail.documents.find((d) => d.kind === 'deposit_proof');
  const proofUploaded = proof?.status === 'uploaded';
  const amountValid = amount.trim() !== '' && Number(amount) > 0;
  const readOnly = detail.registrationStatus === 'approved';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Deposit</h3>
        <DepositStatusBadge status={detail.depositStatus} />
      </div>

      <DocumentUploadCard driverId={detail.id} kind="deposit_proof" document={proof} readOnly={readOnly} />

      {detail.depositAmount > 0 && (
        <p className="text-sm">
          Nominal deposit:{' '}
          <span className="font-semibold tabular-nums">{formatRupiah(detail.depositAmount)}</span>
        </p>
      )}
      {detail.depositStatus === 'rejected' && detail.depositNote && (
        <p className="text-sm text-destructive" role="alert">
          Catatan penolakan: {detail.depositNote}
        </p>
      )}
      {detail.depositDecidedAt && (
        <p className="text-xs text-muted-foreground">
          Keputusan deposit: {formatDateTimeWIB(detail.depositDecidedAt)}
        </p>
      )}

      {!readOnly && detail.depositStatus !== 'waiting' && detail.depositStatus !== 'approved' && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="deposit-amount">Nominal Deposit (Rp)</Label>
              <Input
                id="deposit-amount"
                type="number"
                min={1}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500000"
              />
            </div>
            <Button
              disabled={!proofUploaded || !amountValid || setDeposit.isPending}
              onClick={() => setDeposit.mutate({ amount: Number(amount) })}
            >
              {setDeposit.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Ajukan
            </Button>
          </div>
          {!proofUploaded && (
            <p className="text-xs text-muted-foreground">
              Unggah bukti deposit terlebih dahulu sebelum mengajukan.
            </p>
          )}
          {setDeposit.isError && (
            <p className="text-sm text-destructive" role="alert">
              {setDeposit.error.message}
            </p>
          )}
        </div>
      )}

      {!readOnly && detail.depositStatus === 'waiting' && (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label htmlFor="deposit-note">Catatan (saat menolak)</Label>
            <Input
              id="deposit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nominal tidak sesuai"
              maxLength={250}
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={decide.isPending}
              onClick={() => decide.mutate({ action: 'approve' })}
            >
              {decide.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Setujui Deposit
            </Button>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={decide.isPending}
              onClick={() => decide.mutate({ action: 'reject', note: note.trim() || undefined })}
            >
              Tolak Deposit
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
