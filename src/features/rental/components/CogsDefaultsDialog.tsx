import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatRupiah } from '@/lib/money';
import { useCogsDefaultsQuery, useDeleteCogsDefault, useUpsertCogsDefault } from '../hooks';
import type { CogsDefault } from '../types';

// Manage the per-vehicle-type COGS presets used by the rental form.
export function CogsDefaultsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const defaults = useCogsDefaultsQuery();
  const upsert = useUpsertCogsDefault();
  // The preset outlives `confirmOpen` so the confirm keeps its text while it
  // animates out instead of flashing an empty label.
  const [pendingDelete, setPendingDelete] = useState<CogsDefault | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The BE refuses to delete the last preset (an empty table would re-seed
  // the legacy defaults), so the row never offers it in the first place.
  const canDelete = (defaults.data?.length ?? 0) > 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Atur Default COGS</DialogTitle>
          <DialogDescription>
            Nilai COGS/hari per tipe kendaraan yang dipakai sebagai default saat menambah rental.
          </DialogDescription>
        </DialogHeader>

        {defaults.isPending && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {defaults.isError && (
          <p className="text-sm text-destructive">Gagal memuat: {defaults.error.message}</p>
        )}
        {defaults.isSuccess && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>COGS/Hari</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaults.data.map((preset) => (
                  // remount the row when the server value changes so the
                  // inputs re-sync after a successful save
                  <PresetRow
                    key={`${preset.key}:${preset.label}:${preset.cogsPerDay}`}
                    preset={preset}
                    canDelete={canDelete}
                    onDelete={() => {
                      setPendingDelete(preset);
                      setConfirmOpen(true);
                    }}
                  />
                ))}
                <NewPresetRow />
              </TableBody>
            </Table>
          </div>
        )}
        {upsert.isError && (
          <p className="text-sm text-destructive" role="alert">
            {upsert.error.message}
          </p>
        )}
        {/* Nested inside DialogContent so Radix treats the confirm as a child
            layer — rendered as a sibling, dismissing it would also dismiss
            this dialog. */}
        <DeletePresetDialog
          preset={pendingDelete}
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function PresetRow({
  preset,
  canDelete,
  onDelete,
}: {
  preset: CogsDefault;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const upsert = useUpsertCogsDefault();
  const [label, setLabel] = useState(preset.label);
  const [amount, setAmount] = useState(String(preset.cogsPerDay));
  const changed =
    (label.trim() !== preset.label || Number(amount) !== preset.cogsPerDay) &&
    label.trim() !== '' &&
    amount.trim() !== '' &&
    Number(amount) >= 0;

  return (
    <TableRow>
      <TableCell>
        <Input
          aria-label={`Label ${preset.label}`}
          className="min-w-32"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label={`COGS per hari ${preset.label}`}
          className="min-w-28"
          type="number"
          min={0}
          step={1000}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={!changed || upsert.isPending}
            onClick={() =>
              upsert.mutate({ key: preset.key, label: label.trim(), cogsPerDay: Number(amount) })
            }
          >
            {upsert.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Simpan
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Hapus ${preset.label}`}
            title={canDelete ? undefined : 'Minimal satu tipe COGS harus tersisa'}
            disabled={!canDelete || upsert.isPending}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function DeletePresetDialog({
  preset,
  open,
  onClose,
}: {
  preset: CogsDefault | null;
  open: boolean;
  onClose: () => void;
}) {
  const remove = useDeleteCogsDefault();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (o) return;
        remove.reset();
        onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus tipe COGS ini?</AlertDialogTitle>
          <AlertDialogDescription>
            "{preset?.label}" ({formatRupiah(preset?.cogsPerDay ?? 0)}/hari) tidak akan ditawarkan
            lagi saat menambah rental. Rental yang sudah tercatat tidak berubah.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {remove.isError && (
          <p className="text-sm text-destructive" role="alert">
            Gagal menghapus: {remove.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={remove.isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              if (preset) remove.mutate(preset.key, { onSuccess: onClose });
            }}
          >
            {remove.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function NewPresetRow() {
  const upsert = useUpsertCogsDefault();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const valid = label.trim() !== '' && amount.trim() !== '' && Number(amount) >= 0;

  const add = () =>
    upsert.mutate(
      { label: label.trim(), cogsPerDay: Number(amount) },
      {
        onSuccess: () => {
          setLabel('');
          setAmount('');
        },
      },
    );

  return (
    <TableRow>
      <TableCell>
        <Input
          aria-label="Label tipe baru"
          className="min-w-32"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Tipe baru"
          maxLength={100}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label="COGS per hari tipe baru"
          className="min-w-28"
          type="number"
          min={0}
          step={1000}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="200000"
        />
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" disabled={!valid || upsert.isPending} onClick={add}>
          {upsert.isPending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Plus aria-hidden />
          )}
          Tambah Tipe
        </Button>
      </TableCell>
    </TableRow>
  );
}
