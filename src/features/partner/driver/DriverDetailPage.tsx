import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateID, formatDateTimeWIB } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import { DocumentUploadCard } from './components/DocumentUploadCard';
import { ActiveBadge, DepositStatusBadge } from './components/StatusBadge';
import { useDriverQuery } from './hooks';
import { CHECKABLE_DOC_KINDS, type DriverDetail } from './types';

// Detail driver aktif — info + dokumen (read-only) + info deposit.
export function DriverDetailPage({ id, onBack }: { id: number; onBack: () => void }) {
  const detail = useDriverQuery(id);

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
  return <DriverDetailView detail={detail.data} onBack={onBack} />;
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || '-'}</dd>
    </div>
  );
}

function DriverDetailView({ detail, onBack }: { detail: DriverDetail; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden /> Kembali
        </Button>
        <h2 className="text-lg font-semibold">{detail.name}</h2>
        <ActiveBadge isActive={detail.isActive} />
      </div>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Data Driver</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="Kode Driver" value={detail.driverCode} />
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
            Bergabung {formatDateTimeWIB(detail.joinedAt)}
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
              readOnly
            />
          ))}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Deposit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">
              Nominal:{' '}
              <span className="font-semibold tabular-nums">{formatRupiah(detail.depositAmount)}</span>
            </span>
            <DepositStatusBadge status={detail.depositStatus} />
          </div>
          <DocumentUploadCard
            driverId={detail.id}
            kind="deposit_proof"
            document={detail.documents.find((d) => d.kind === 'deposit_proof')}
            readOnly
          />
          {detail.depositDecidedAt && (
            <p className="text-xs text-muted-foreground">
              Keputusan deposit: {formatDateTimeWIB(detail.depositDecidedAt)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
