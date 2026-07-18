import { useState } from 'react';
import { ArrowLeft, Loader2, UserMinus, Undo2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatDateTimeWIB } from '@/lib/datetime';
import { formatRupiah } from '@/lib/money';
import { DocumentUploadCard } from './components/DocumentUploadCard';
import {
  MasterFields,
  masterInputFrom,
  masterValuesFrom,
  type MasterFormValues,
} from './components/MasterFields';
import { DepositReturnBadge, LifecycleBadge, SourceBadge } from './components/StatusBadge';
import { useDriverQuery, useUpdateDriver } from './hooks';
import { IDENTITY_DOC_KINDS, type DriverDetail } from './types';

// Halaman edit driver — satu tempat untuk melengkapi data hasil sinkronisasi
// Fleet Monitoring, mengelola dokumen & deposit, dan menjalankan lifecycle
// resign + pengembalian deposit (menggantikan halaman Registrasi/Resign lama).
export function DriverEditPage({ id, onBack }: { id: number; onBack: () => void }) {
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
  return <DriverEditView key={detail.data.id} detail={detail.data} onBack={onBack} />;
}

function DriverEditView({ detail, onBack }: { detail: DriverDetail; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Kembali ke daftar driver"
          onClick={onBack}
        >
          <ArrowLeft />
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-lg leading-tight font-semibold">{detail.name}</h2>
          {detail.driverCode && (
            <p className="font-mono text-xs text-muted-foreground">{detail.driverCode}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <SourceBadge source={detail.source} />
          <LifecycleBadge isActive={detail.isActive} resignedAt={detail.resignedAt} />
        </div>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <InfoCard detail={detail} />
        <div className="grid gap-4">
          <DocumentsCard detail={detail} />
          <DepositCard detail={detail} />
          <LifecycleCard detail={detail} />
        </div>
      </div>
    </div>
  );
}

// ---- a. Informasi Driver -------------------------------------------------------

function InfoCard({ detail }: { detail: DriverDetail }) {
  const update = useUpdateDriver(detail.id);
  const [baseline, setBaseline] = useState(() => ({
    values: masterValuesFrom(detail),
    isActive: detail.isActive,
  }));
  const [values, setValues] = useState<MasterFormValues>(baseline.values);
  const [isActive, setIsActive] = useState(baseline.isActive);
  const patch = (p: Partial<MasterFormValues>) => setValues((prev) => ({ ...prev, ...p }));

  const dirty =
    isActive !== baseline.isActive || JSON.stringify(values) !== JSON.stringify(baseline.values);
  const canSubmit = dirty && values.name.trim() !== '';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || update.isPending) return;
    update.mutate(
      { ...masterInputFrom(values), isActive },
      {
        onSuccess: (saved) =>
          setBaseline({ values: masterValuesFrom(saved), isActive: saved.isActive }),
      },
    );
  };

  return (
    <Card className="py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm">Informasi Driver</CardTitle>
        <CardDescription>
          Lengkapi data hasil sinkronisasi — perubahan disimpan lewat tombol Simpan.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <form onSubmit={submit} className="space-y-4">
          <MasterFields idPrefix="driver-edit" values={values} onChange={patch} />

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="driver-edit-active">Status Aktif</Label>
              <p className="text-xs text-muted-foreground">
                Driver nonaktif tetap ada di daftar, tapi ditandai tidak beroperasi.
              </p>
            </div>
            <Switch
              id="driver-edit-active"
              checked={isActive}
              disabled={detail.resignedAt != null}
              onCheckedChange={setIsActive}
            />
          </div>

          {update.isError && (
            <p className="text-sm text-destructive" role="alert">
              {update.error.message}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            {dirty && !update.isPending && (
              <span className="text-xs text-muted-foreground">Perubahan belum disimpan</span>
            )}
            <Button type="submit" disabled={!canSubmit || update.isPending}>
              {update.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Simpan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---- b. Dokumen ---------------------------------------------------------------

function DocumentsCard({ detail }: { detail: DriverDetail }) {
  return (
    <Card className="py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm">Dokumen</CardTitle>
        <CardDescription>KTP dan SIM driver (JPG, PNG, atau PDF).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {IDENTITY_DOC_KINDS.map((kind) => (
          <DocumentUploadCard
            key={kind}
            driverId={detail.id}
            kind={kind}
            document={detail.documents.find((d) => d.kind === kind)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ---- c. Deposit -----------------------------------------------------------------

function DepositCard({ detail }: { detail: DriverDetail }) {
  const update = useUpdateDriver(detail.id);
  const [amount, setAmount] = useState(
    detail.depositAmount > 0 ? String(detail.depositAmount) : '',
  );

  const parsed = Number(amount);
  const amountValid = amount.trim() !== '' && Number.isInteger(parsed) && parsed >= 0;
  const dirty = amountValid && parsed !== detail.depositAmount;

  return (
    <Card className="py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm">Deposit</CardTitle>
        <CardDescription>Nominal deposit (rupiah bulat) dan bukti setornya.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="driver-deposit-amount">Nominal Deposit (Rp)</Label>
            <Input
              id="driver-deposit-amount"
              type="number"
              min={0}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1500000"
            />
            {amountValid && parsed > 0 && (
              <p className="text-xs text-muted-foreground tabular-nums">= {formatRupiah(parsed)}</p>
            )}
          </div>
          <Button
            disabled={!dirty || update.isPending}
            onClick={() => update.mutate({ depositAmount: parsed })}
          >
            {update.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Simpan Deposit
          </Button>
        </div>

        <DocumentUploadCard
          driverId={detail.id}
          kind="deposit_proof"
          document={detail.documents.find((d) => d.kind === 'deposit_proof')}
        />

        {update.isError && (
          <p className="text-sm text-destructive" role="alert">
            {update.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---- d. Resign & Pengembalian Deposit ---------------------------------------------

function LifecycleCard({ detail }: { detail: DriverDetail }) {
  const update = useUpdateDriver(detail.id);
  const resigned = detail.resignedAt != null;
  const returned = detail.depositReturnStatus === 'approved';
  const proof = detail.documents.find((d) => d.kind === 'deposit_return_proof');
  const proofUploaded = proof?.status === 'uploaded';

  return (
    <Card className="py-4">
      <CardHeader className="px-4 pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Resign &amp; Pengembalian Deposit</CardTitle>
          {resigned && (
            <DepositReturnBadge
              status={detail.depositReturnStatus}
              decidedAt={detail.depositReturnDecidedAt}
            />
          )}
        </div>
        <CardDescription>
          {resigned
            ? `Resign sejak ${formatDateTimeWIB(detail.resignedAt!)} — kelola pengembalian deposit di sini.`
            : 'Tandai driver yang berhenti bekerja; pengembalian deposit dikelola setelahnya.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {!resigned ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={update.isPending}
              >
                <UserMinus aria-hidden />
                Tandai Resign
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tandai resign?</AlertDialogTitle>
                <AlertDialogDescription>
                  {detail.name} ({detail.driverCode ?? 'tanpa kode'}) akan ditandai resign dan
                  dinonaktifkan. Pengembalian deposit dikelola dari kartu ini setelahnya.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => update.mutate({ resigned: true })}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Tandai Resign
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <>
            <DocumentUploadCard
              driverId={detail.id}
              kind="deposit_return_proof"
              document={proof}
              readOnly={returned}
            />

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="driver-deposit-returned">Deposit dikembalikan</Label>
                <p className="text-xs text-muted-foreground">
                  {returned
                    ? `Deposit ${formatRupiah(detail.depositAmount)} tercatat sudah dikembalikan.`
                    : proofUploaded
                      ? `Tandai jika deposit ${formatRupiah(detail.depositAmount)} sudah dikembalikan ke driver.`
                      : 'Unggah bukti pengembalian deposit terlebih dahulu.'}
                </p>
              </div>
              <Switch
                id="driver-deposit-returned"
                checked={returned}
                disabled={update.isPending || (!returned && !proofUploaded)}
                onCheckedChange={(checked) => update.mutate({ depositReturned: checked })}
              />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={update.isPending}>
                  <Undo2 aria-hidden />
                  Batalkan Resign
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Batalkan resign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {detail.name} kembali ke roster dan status pengembalian deposit akan direset
                    (catatan &quot;deposit dikembalikan&quot; dihapus).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => update.mutate({ resigned: false })}>
                    Batalkan Resign
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {update.isError && (
          <p className="text-sm text-destructive" role="alert">
            {update.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
