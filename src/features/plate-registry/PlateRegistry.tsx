import { useState, type ReactNode } from 'react';
import { ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { PlateForm } from './components/PlateForm';
import { PlateTable } from './components/PlateTable';
import type { PlateRegistryController, PlateRow } from './types';

/**
 * Plate registration screen, shared by the partner portal ("Daftarkan Plat")
 * and the admin console ("Plate Registration"). It owns no data: the audience's
 * page passes a `controller` of TanStack query/mutations, the copy, and whether
 * to show the admin-only Partner column.
 */
export function PlateRegistry<TRow extends PlateRow>({
  title,
  description,
  emptyDescription,
  controller,
  showPartnerColumn = false,
  partnerColumnNote,
}: {
  title: string;
  description: ReactNode;
  /** Shown under "Belum ada plat terdaftar". */
  emptyDescription: string;
  controller: PlateRegistryController<TRow>;
  showPartnerColumn?: boolean;
  /** Explains what the Partner column means; rendered under the table. */
  partnerColumnNote?: string;
}) {
  const { list, register, update, remove } = controller;
  const [editing, setEditing] = useState<PlateRow | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Tambah Plat</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <PlateForm
            mode="create"
            idPrefix="add-plate"
            pending={register.isPending}
            error={register.error}
            onSubmit={(input, done) => register.mutate(input, { onSuccess: done })}
          />
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">
            Plat Terdaftar {list.data ? `(${list.data.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {list.isPending && (
            <div className="space-y-2 py-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          )}
          {list.isError && (
            <p className="text-sm text-destructive" role="alert">
              Gagal memuat: {list.error.message}
            </p>
          )}
          {list.isSuccess && list.data.length === 0 && (
            <EmptyState
              icon={ClipboardList}
              title="Belum ada plat terdaftar"
              description={emptyDescription}
            />
          )}
          {list.isSuccess && list.data.length > 0 && (
            <>
              <PlateTable
                plates={list.data}
                showPartner={showPartnerColumn}
                onEdit={setEditing}
                onDelete={(id) => remove.mutate(id)}
              />
              {showPartnerColumn && partnerColumnNote && (
                <p className="mt-3 text-xs text-muted-foreground">{partnerColumnNote}</p>
              )}
            </>
          )}
          {remove.isError && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {remove.error.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Plat</DialogTitle>
            <DialogDescription className="sr-only">
              Ubah nomor plat dan Type kendaraan yang terdaftar.
            </DialogDescription>
          </DialogHeader>
          {/* keyed remount → the form re-initializes from the freshly-picked plate */}
          {editing && (
            <PlateForm
              key={editing.id}
              mode="edit"
              idPrefix="edit-plate"
              defaultValues={{
                plateNumber: editing.plateNumber,
                vehicleType: editing.vehicleType ?? '',
              }}
              pending={update.isPending}
              error={update.error}
              onCancel={() => setEditing(null)}
              onSubmit={(input, done) =>
                update.mutate(
                  { id: editing.id, ...input },
                  {
                    onSuccess: () => {
                      done();
                      setEditing(null);
                    },
                  },
                )
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
