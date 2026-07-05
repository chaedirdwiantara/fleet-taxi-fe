import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrderQuery } from '@/features/partner/hooks';
import { formatRupiah } from '@/lib/money';
import { formatDateTimeWIB } from '@/lib/datetime';

export const Route = createFileRoute('/_partner/partner/orders/$orderId')({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const order = useOrderQuery(orderId);

  return (
    <div className="max-w-xl space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/partner/orders" search={{ page: 1, pageSize: 20 }}>
          <ArrowLeft aria-hidden /> Kembali ke orders
        </Link>
      </Button>

      {order.isPending && <p className="text-sm text-muted-foreground">Memuat order…</p>}
      {order.isError && (
        <p className="text-sm text-destructive">Gagal memuat: {order.error.message}</p>
      )}
      {order.isSuccess && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{order.data.orderNumber}</span>
              <Badge>{order.data.tripStatus}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Tipe order</dt>
              <dd>{order.data.orderType}</dd>
              <dt className="text-muted-foreground">Rute</dt>
              <dd>
                {order.data.pickupCode} → {order.data.destinationCode}
              </dd>
              <dt className="text-muted-foreground">Jemput (WIB)</dt>
              <dd>{formatDateTimeWIB(order.data.pickupAt)}</dd>
              <dt className="text-muted-foreground">Harga dasar</dt>
              <dd className="tabular-nums">{formatRupiah(order.data.basicPrice)}</dd>
              <dt className="text-muted-foreground">Dibuat</dt>
              <dd>{formatDateTimeWIB(order.data.createdAt)}</dd>
              {order.data.passengerDetails && (
                <>
                  <dt className="text-muted-foreground">Penumpang</dt>
                  <dd>
                    <pre className="rounded bg-muted p-2 text-xs">
                      {JSON.stringify(order.data.passengerDetails, null, 2)}
                    </pre>
                  </dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
