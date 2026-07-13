import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeWIB } from '@/lib/datetime';
import { DepositReturnPanel } from './components/DepositReturnPanel';
import { DepositReturnStatusBadge } from './components/StatusBadge';
import { useResignationQuery } from './hooks';
import type { ResignationDetail } from './types';

// Detail resign: info driver + alur pengembalian deposit (upload bukti →
// ajukan → keputusan) + jejak audit tanggal keputusan.
export function ResignationDetailPage({ id, onBack }: { id: number; onBack: () => void }) {
  const detail = useResignationQuery(id);

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
  return <ResignationDetailView detail={detail.data} onBack={onBack} />;
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || '-'}</dd>
    </div>
  );
}

function ResignationDetailView({
  detail,
  onBack,
}: {
  detail: ResignationDetail;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden /> Kembali
        </Button>
        <h2 className="text-lg font-semibold">Pengembalian Deposit — {detail.name}</h2>
        <DepositReturnStatusBadge status={detail.depositReturnStatus} />
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
            <InfoRow label="Plat Unit" value={detail.plateNumber} />
            <InfoRow label="Rekening Bank" value={detail.bankAccount} />
            <InfoRow label="Tanggal Bergabung" value={formatDateTimeWIB(detail.joinedAt)} />
            <InfoRow label="Tanggal Resign" value={formatDateTimeWIB(detail.resignedAt)} />
          </dl>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardContent className="px-4">
          <DepositReturnPanel detail={detail} />
        </CardContent>
      </Card>
    </div>
  );
}
