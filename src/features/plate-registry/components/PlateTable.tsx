import { Pencil, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { PlateRow } from '../types';

// Freezes the Aksi column against the right edge while the rest scrolls under
// it; inert when the table already fits (nothing to scroll). The pinned cell
// needs an OPAQUE background, so the row's translucent hover tint is resolved
// against the card here — otherwise it would stack over itself and read darker
// than the rest of the row.
const STICKY_ACTION =
  'sticky right-0 bg-card shadow-[inset_1px_0_0_0_var(--border)] ' +
  'transition-colors [tr:hover_&]:bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]';

/**
 * Registered plates with their row actions. `showPartner` adds the admin-only
 * column naming the partner that registered the same plate in its own portal.
 */
export function PlateTable({
  plates,
  showPartner = false,
  onEdit,
  onDelete,
}: {
  plates: PlateRow[];
  showPartner?: boolean;
  onEdit: (plate: PlateRow) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">No</TableHead>
            <TableHead>Nomor Plat</TableHead>
            <TableHead>Type</TableHead>
            {showPartner && <TableHead>Partner</TableHead>}
            {/* pinned right: with the Partner column the table outgrows a phone,
                and the row actions must stay reachable without scrolling */}
            <TableHead className={cn('w-20 text-right', showPartner && STICKY_ACTION)}>
              Aksi
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plates.map((plate, i) => (
            <TableRow key={plate.id}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-medium whitespace-nowrap">{plate.plateNumber}</TableCell>
              <TableCell className="text-muted-foreground">{plate.vehicleType || '-'}</TableCell>
              {showPartner && <PartnerCell plate={plate} />}
              <TableCell className={cn('text-right', showPartner && STICKY_ACTION)}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${plate.plateNumber}`}
                  className="text-amber-600 hover:bg-amber-500/10"
                  onClick={() => onEdit(plate)}
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
                        {plate.vehicleType ? ` · ${plate.vehicleType}` : ''} akan dihapus dari
                        daftar. Data monitoring untuk plat ini tidak akan tampil lagi.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(plate.id)}
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
  );
}

/**
 * The admin-only Partner column. The name the admin typed wins; when it is
 * empty we still show the partner that registered the same plate in its own
 * portal, in an outline badge so the two sources never read as the same claim.
 */
function PartnerCell({ plate }: { plate: PlateRow }) {
  const typed = plate.partnerName?.trim();
  const registered = plate.registeredPartnerName?.trim();

  return (
    <TableCell className="whitespace-nowrap">
      {typed ? (
        <Badge variant="secondary">{typed}</Badge>
      ) : registered ? (
        <Badge variant="outline" title="Dari registrasi partner di portalnya">
          {registered}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </TableCell>
  );
}
