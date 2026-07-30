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
import { useDeleteInstallment } from '../hooks';
import type { InstallmentRule } from '../types';

export function DeleteInstallmentDialog({
  rule,
  onClose,
}: {
  rule: InstallmentRule | null;
  onClose: () => void;
}) {
  const remove = useDeleteInstallment();

  return (
    <AlertDialog open={rule != null} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus cicilan ini?</AlertDialogTitle>
          <AlertDialogDescription>
            "{rule?.title}" untuk driver {rule?.driverName} akan dihapus permanen beserta rekap
            cicilannya. Tindakan ini tidak dapat dibatalkan.
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
            onClick={(e) => {
              e.preventDefault();
              if (rule) remove.mutate(rule.id, { onSuccess: onClose });
            }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {remove.isPending ? 'Menghapus…' : 'Hapus'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
