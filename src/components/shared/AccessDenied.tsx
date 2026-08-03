import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Client-side gate for a page a role may not open. UX only — the backend (CASL)
 * is the real authority, so this never has to be trusted, only to explain.
 */
export function AccessDenied({ what }: { what: string }) {
  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-5 text-destructive" aria-hidden />
            Akses ditolak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {what} hanya tersedia untuk <strong>super admin</strong>. Hubungi administrator jika
            Anda memerlukan akses.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
