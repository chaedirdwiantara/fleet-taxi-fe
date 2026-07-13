import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { formatDateID, formatDateTimeWIB } from '@/lib/datetime';
import { DepositPanel } from './components/DepositPanel';
import { DocumentUploadCard } from './components/DocumentUploadCard';
import { RegistrationStatusBadge } from './components/StatusBadge';
import { useDocCheck, useRegistrationQuery, useVerifyRegistration } from './hooks';
import { CHECKABLE_DOC_KINDS, type CheckableDocKind, type RegistrationDetail } from './types';

// Halaman verifikasi satu registrasi: data kandidat, dokumen + doc-check,
// deposit, dan keputusan akhir. `Terima` mirrors the server preconditions
// (deposit approved + 3 dokumen terverifikasi) as disabled state + helper text.
export function RegistrationDetailPage({
  id,
  onBack,
  onApproved,
}: {
  id: number;
  onBack: () => void;
  /** Approval moves the row to Daftar Driver — the caller navigates there. */
  onApproved: () => void;
}) {
  const detail = useRegistrationQuery(id);

  if (detail.isPending) {
    return <p className="text-sm text-muted-foreground">Memuat…</p>;
  }
  if (detail.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Gagal memuat: {detail.error.message}</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden /> Kembali
        </Button>
      </div>
    );
  }
  return <RegistrationDetailView detail={detail.data} onBack={onBack} onApproved={onApproved} />;
}

const VERIFIED_FLAG: Record<CheckableDocKind, 'ktpVerified' | 'simVerified' | 'skckVerified'> = {
  ktp: 'ktpVerified',
  sim: 'simVerified',
  skck: 'skckVerified',
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || '-'}</dd>
    </div>
  );
}

function RegistrationDetailView({
  detail,
  onBack,
  onApproved,
}: {
  detail: RegistrationDetail;
  onBack: () => void;
  onApproved: () => void;
}) {
  const docCheck = useDocCheck(detail.id);
  const verify = useVerifyRegistration(detail.id);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const allDocsVerified = detail.ktpVerified && detail.simVerified && detail.skckVerified;
  const depositApproved = detail.depositStatus === 'approved';
  const canApprove = allDocsVerified && depositApproved;
  const decided = detail.registrationStatus !== 'pending';

  const unmet: string[] = [];
  if (!depositApproved) unmet.push('deposit belum disetujui');
  if (!allDocsVerified) unmet.push('semua dokumen (KTP, SIM, SKCK) harus terverifikasi');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden /> Kembali
        </Button>
        <h2 className="text-lg font-semibold">Verifikasi Driver</h2>
        <RegistrationStatusBadge status={detail.registrationStatus} />
      </div>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Data Kandidat</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="Nama" value={detail.name} />
            <InfoRow label="Email" value={detail.email} />
            <InfoRow label="Telepon" value={detail.phone} />
            <InfoRow label="Nomor KTP" value={detail.ktpNo} />
            <InfoRow label="Nomor SIM" value={detail.simNo} />
            <InfoRow
              label="Masa Berlaku SIM"
              value={detail.simExpired ? formatDateID(detail.simExpired) : null}
            />
            <InfoRow label="Plat Unit" value={detail.plateNumber} />
            <InfoRow label="Rekening Bank" value={detail.bankAccount} />
            <InfoRow label="Alamat" value={detail.address} />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Didaftarkan {formatDateTimeWIB(detail.createdAt)}
          </p>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Dokumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          {CHECKABLE_DOC_KINDS.map((kind) => (
            <DocumentUploadCard
              key={kind}
              driverId={detail.id}
              kind={kind}
              document={detail.documents.find((d) => d.kind === kind)}
              verified={detail[VERIFIED_FLAG[kind]]}
              onVerifiedChange={(verified) => docCheck.mutate({ kind, verified })}
              verifyPending={docCheck.isPending}
              readOnly={decided}
            />
          ))}
          {docCheck.isError && (
            <p className="text-sm text-destructive" role="alert">
              {docCheck.error.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardContent className="px-4">
          <DepositPanel detail={detail} />
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Keputusan Verifikasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          {detail.registrationStatus === 'rejected' && (
            <p className="text-sm text-destructive" role="alert">
              Registrasi ditolak{detail.rejectNote ? ` — ${detail.rejectNote}` : '.'}
            </p>
          )}
          <Separator />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={!canApprove || verify.isPending || detail.registrationStatus === 'approved'}
              onClick={() => verify.mutate({ action: 'approve' }, { onSuccess: onApproved })}
            >
              {verify.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 aria-hidden />
              )}
              Terima
            </Button>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={verify.isPending || decided}
              onClick={() => setRejectOpen(true)}
            >
              <XCircle aria-hidden />
              Tolak
            </Button>
          </div>
          {!canApprove && !decided && (
            <p className="text-xs text-muted-foreground">
              Terima dinonaktifkan: {unmet.join(' dan ')}.
            </p>
          )}
          {verify.isError && (
            <p className="text-sm text-destructive" role="alert">
              {verify.error.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak registrasi ini?</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">Alasan Penolakan</Label>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Dokumen tidak jelas"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={verify.isPending}
              onClick={() =>
                verify.mutate(
                  { action: 'reject', rejectNote: rejectNote.trim() || undefined },
                  { onSuccess: () => setRejectOpen(false) },
                )
              }
            >
              Tolak Registrasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
