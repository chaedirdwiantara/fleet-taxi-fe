import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
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
import { useCogsDefaultsQuery, useUpsertCogsDefault } from '../hooks';
import type { CogsDefault } from '../types';

// Manage the per-vehicle-type COGS presets used by the rental form.
export function CogsDefaultsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const defaults = useCogsDefaultsQuery();
  const upsert = useUpsertCogsDefault();

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
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaults.data.map((preset) => (
                  // remount the row when the server value changes so the
                  // inputs re-sync after a successful save
                  <PresetRow
                    key={`${preset.key}:${preset.label}:${preset.cogsPerDay}`}
                    preset={preset}
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
      </DialogContent>
    </Dialog>
  );
}

function PresetRow({ preset }: { preset: CogsDefault }) {
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
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label={`COGS per hari ${preset.label}`}
          type="number"
          min={0}
          step={1000}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </TableCell>
      <TableCell className="text-right">
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
      </TableCell>
    </TableRow>
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
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Tipe baru"
          maxLength={100}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label="COGS per hari tipe baru"
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
