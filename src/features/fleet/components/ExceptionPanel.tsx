import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateID } from '@/lib/datetime';
import {
  useCreateException,
  useDeleteException,
  useExceptionsQuery,
  type ExceptionScope,
} from '../hooks/useExceptions';

// Gojek exception calendar (§6.1) — controlled dialog so it can be opened from
// the toolbar or from a row's "Kelola Jadwal" action (prefilled plate).
// isBebasSetoran=true reduces the month's target days (server-side math).
// scope='partner' targets the portal endpoints (limited server-side to the
// partner's own registered plates).
export function ExceptionPanel({
  month,
  year,
  open,
  onOpenChange,
  defaultPlate,
  scope = 'admin',
}: {
  month: number;
  year: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlate?: string;
  scope?: ExceptionScope;
}) {
  const exceptions = useExceptionsQuery({ month, year, scope });
  const create = useCreateException(scope);
  const remove = useDeleteException(scope);

  const [plate, setPlate] = useState(defaultPlate ?? '');
  const [date, setDate] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [bebasSetoran, setBebasSetoran] = useState(true);

  // Prefill the plate on each (re)open, reconciled during render keyed on the
  // open+defaultPlate transition (avoids a setState-in-effect cascade).
  const [openKey, setOpenKey] = useState('');
  const key = open ? `open:${defaultPlate ?? ''}` : 'closed';
  if (key !== openKey) {
    setOpenKey(key);
    if (open) setPlate(defaultPlate ?? '');
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim() || !date) return;
    create.mutate(
      {
        vehiclePlate: plate.trim().toUpperCase(),
        exceptionDate: date,
        keterangan: keterangan.trim() || undefined,
        isBebasSetoran: bebasSetoran,
      },
      {
        onSuccess: () => {
          setKeterangan('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Kelola Jadwal Pengecualian{defaultPlate ? ` — ${defaultPlate}` : ''}
          </DialogTitle>
          <DialogDescription>
            Tandai hari rental / perbaikan / bebas-setoran. Hari bebas-setoran mengurangi target
            bulanan; hari yang tetap ada setorannya mengabaikan exception.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border p-3">
            <div className="grid gap-1.5">
              <Label htmlFor="exc-plate">Plat</Label>
              <Input
                id="exc-plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="B1234XYZ"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exc-date">Tanggal</Label>
              <Input
                id="exc-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exc-note">Keterangan</Label>
              <Input
                id="exc-note"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="RENTAL / PERBAIKAN / …"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={bebasSetoran}
                onCheckedChange={(c) => setBebasSetoran(c === true)}
              />
              <span>
                <span className="font-medium">Bebas Setoran</span>
                <span className="block text-xs text-muted-foreground">
                  Sistem menghentikan perhitungan target harian untuk tanggal itu.
                </span>
              </span>
            </label>
            {create.isError && (
              <p className="text-sm text-destructive">Gagal menambah: {create.error.message}</p>
            )}
            <Button type="submit" disabled={create.isPending}>
              Simpan Jadwal
            </Button>
          </form>

          <div className="rounded-lg border p-3">
            <h4 className="mb-2 text-sm font-semibold">Jadwal Bulan Ini</h4>
            <ul className="max-h-72 space-y-1 overflow-auto">
              {exceptions.data?.map((exc) => (
                <li
                  key={exc.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{exc.vehiclePlate}</span>
                    <span className="ml-2 text-muted-foreground">
                      {formatDateID(exc.exceptionDate)}
                    </span>
                    {exc.keterangan && (
                      <span className="ml-1 truncate text-muted-foreground">
                        · {exc.keterangan}
                      </span>
                    )}
                    <Badge variant={exc.isBebasSetoran ? 'secondary' : 'outline'} className="ml-2">
                      {exc.isBebasSetoran ? 'Bebas Target' : 'Tetap Ditagih'}
                    </Badge>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus exception ${exc.vehiclePlate} ${exc.exceptionDate}`}
                    onClick={() => remove.mutate(exc.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="text-destructive" aria-hidden />
                  </Button>
                </li>
              ))}
              {exceptions.isSuccess && exceptions.data.length === 0 && (
                <li className="rounded-md border px-2 py-6 text-center text-sm text-muted-foreground">
                  Belum ada exception pada bulan ini.
                </li>
              )}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
