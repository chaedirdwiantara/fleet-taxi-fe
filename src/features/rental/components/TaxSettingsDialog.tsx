import { useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTaxSettingsQuery, useUpdateTaxSettings } from '../hooks';
import type { RentalTaxSettings } from '../types';

/** 1100 → "11%" — the rate is server-owned, never hardcoded here. */
const formatRate = (rateBps: number): string =>
  `${(rateBps / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;

/**
 * PKP status + NPWP. Turning this on starts charging PPN on rentals created
 * afterwards — existing transactions keep the rate they were billed at, which
 * the copy states plainly so nobody expects a retroactive change.
 */
export function TaxSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useTaxSettingsQuery();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Atur PPN</DialogTitle>
          <DialogDescription>
            Hanya Pengusaha Kena Pajak (PKP) yang boleh memungut PPN dan menerbitkan faktur pajak.
          </DialogDescription>
        </DialogHeader>

        {settings.isPending && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {settings.isError && (
          <p className="text-sm text-destructive">Gagal memuat: {settings.error.message}</p>
        )}
        {settings.isSuccess && (
          // Keyed on the server value so the inputs re-seed after a save,
          // without an effect syncing state behind the user's back.
          <TaxSettingsForm
            key={`${settings.data.isPkp}:${settings.data.npwp ?? ''}`}
            settings={settings.data}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TaxSettingsForm({
  settings,
  onClose,
}: {
  settings: RentalTaxSettings;
  onClose: () => void;
}) {
  const update = useUpdateTaxSettings();
  const [isPkp, setIsPkp] = useState(settings.isPkp);
  const [npwp, setNpwp] = useState(settings.npwp ?? '');

  const save = () => update.mutate({ isPkp, npwp: npwp.trim() }, { onSuccess: () => onClose() });

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="is-pkp" className="text-sm font-medium">
              Partner berstatus PKP
            </Label>
            <p className="text-xs text-muted-foreground">
              Menyalakan ini menambahkan PPN {formatRate(settings.statutoryRateBps)} pada rental
              yang dibuat setelahnya.
            </p>
          </div>
          <Switch id="is-pkp" checked={isPkp} onCheckedChange={setIsPkp} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="npwp">NPWP</Label>
          <Input
            id="npwp"
            value={npwp}
            onChange={(e) => setNpwp(e.target.value)}
            placeholder="01.234.567.8-901.000"
            inputMode="numeric"
          />
          <p className="text-xs text-muted-foreground">Dicetak pada kop invoice.</p>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Transaksi yang sudah ada tetap memakai tarif saat ditagihkan — mengubah pengaturan ini
            tidak menulis ulang invoice yang sudah terbit. PPN dihitung dari sewa ditambah biaya
            tambahan; deposit tidak dikenakan PPN.
          </span>
        </div>

        {update.isError && (
          <p className="text-sm text-destructive" role="alert">
            {update.error.message}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={update.isPending}>
          Batal
        </Button>
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Simpan
        </Button>
      </DialogFooter>
    </>
  );
}
