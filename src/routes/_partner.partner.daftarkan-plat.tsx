import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useDeletePlate,
  usePartnerPlatesQuery,
  useRegisterPlate,
  useUpdatePlate,
} from '@/features/partner/hooks';
import type { PartnerPlate } from '@/features/partner/types';

// "Daftarkan Plat" (legacy /partner/plates: nomor + Type). Registered plates
// define which vehicles the partner sees on the Gojek/Grab monitoring pages.
export const Route = createFileRoute('/_partner/partner/daftarkan-plat')({
  component: DaftarkanPlatPage,
});

function DaftarkanPlatPage() {
  const plates = usePartnerPlatesQuery();
  const register = useRegisterPlate();
  const remove = useDeletePlate();

  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [editing, setEditing] = useState<PartnerPlate | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim()) return;
    register.mutate(
      { plateNumber: plateNumber.trim(), vehicleType: vehicleType.trim() || undefined },
      {
        onSuccess: () => {
          setPlateNumber('');
          setVehicleType('');
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Daftarkan Plat</h2>
        <p className="text-sm text-muted-foreground">
          Daftarkan nomor plat kendaraan Anda untuk melihat data setoran Gojek &amp; Grab yang
          bersangkutan.
        </p>
      </div>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Tambah Plat</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="plateNumber">Nomor Plat</Label>
              <Input
                id="plateNumber"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="B 1793 SCP"
                autoComplete="off"
                maxLength={20}
                required
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="vehicleType">Type (opsional)</Label>
              <Input
                id="vehicleType"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="Premium - BYD M6"
                autoComplete="off"
                maxLength={100}
              />
            </div>
            <Button type="submit" disabled={register.isPending || !plateNumber.trim()}>
              {register.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Plus aria-hidden />
              )}
              Tambah
            </Button>
          </form>
          {register.isError && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {register.error.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">
            Plat Terdaftar {plates.data ? `(${plates.data.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {plates.isPending && <p className="text-sm text-muted-foreground">Memuat…</p>}
          {plates.isError && (
            <p className="text-sm text-destructive">Gagal memuat: {plates.error.message}</p>
          )}
          {plates.isSuccess && plates.data.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada plat terdaftar. Tambahkan plat pertama Anda di atas.
            </p>
          )}
          {plates.isSuccess && plates.data.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nomor Plat</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-20 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plates.data.map((plate, i) => (
                    <TableRow key={plate.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{plate.plateNumber}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {plate.vehicleType || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${plate.plateNumber}`}
                          className="text-amber-600 hover:bg-amber-500/10"
                          onClick={() => setEditing(plate)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Hapus ${plate.plateNumber}`}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus plat ini?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {plate.plateNumber}
                                {plate.vehicleType ? ` · ${plate.vehicleType}` : ''} akan dihapus
                                dari daftar. Data monitoring untuk plat ini tidak akan tampil lagi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => remove.mutate(plate.id)}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {remove.isError && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {remove.error.message}
            </p>
          )}
        </CardContent>
      </Card>

      <EditPlateDialog plate={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditPlateDialog({ plate, onClose }: { plate: PartnerPlate | null; onClose: () => void }) {
  return (
    <Dialog open={plate != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Plat</DialogTitle>
        </DialogHeader>
        {/* keyed remount → the form re-initializes from the freshly-picked plate */}
        {plate && <EditPlateForm key={plate.id} plate={plate} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EditPlateForm({ plate, onClose }: { plate: PartnerPlate; onClose: () => void }) {
  const update = useUpdatePlate();
  const [plateNumber, setPlateNumber] = useState(plate.plateNumber);
  const [vehicleType, setVehicleType] = useState(plate.vehicleType ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim()) return;
    update.mutate(
      {
        id: plate.id,
        plateNumber: plateNumber.trim(),
        vehicleType: vehicleType.trim() || undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="edit-plate">Nomor Plat</Label>
        <Input
          id="edit-plate"
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value)}
          maxLength={20}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-type">Type (opsional)</Label>
        <Input
          id="edit-type"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
          placeholder="Premium - BYD M6"
          maxLength={100}
        />
      </div>
      {update.isError && (
        <p className="text-sm text-destructive" role="alert">
          {update.error.message}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" disabled={update.isPending || !plateNumber.trim()}>
          {update.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Simpan
        </Button>
      </DialogFooter>
    </form>
  );
}
