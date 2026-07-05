import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, FileDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useExportOrders, useOrdersQuery } from '@/features/partner/hooks';
import { formatRupiah } from '@/lib/money';
import { formatDateTimeWIB } from '@/lib/datetime';

const ordersSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(5).max(100).catch(20),
});

export const Route = createFileRoute('/_partner/partner/orders/')({
  validateSearch: ordersSearchSchema,
  component: OrdersPage,
});

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'completed') return 'default';
  if (status === 'cancelled') return 'destructive';
  return 'secondary';
}

function OrdersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const orders = useOrdersQuery(search);
  const exportOrders = useExportOrders();

  const meta = orders.data?.meta;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;

  const goto = (page: number) =>
    navigate({ search: (prev) => ({ ...prev, page }), replace: true });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Orders</h2>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total.toLocaleString('id-ID')} order` : '…'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportOrders.mutate('xlsx')}
            disabled={exportOrders.isPending}
          >
            {exportOrders.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <FileDown aria-hidden />}
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => exportOrders.mutate('pdf')}
            disabled={exportOrders.isPending}
          >
            {exportOrders.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <FileDown aria-hidden />}
            PDF
          </Button>
        </div>
      </div>
      {exportOrders.isError && (
        <p className="text-sm text-destructive">Export gagal: {exportOrders.error.message}</p>
      )}

      {orders.isPending && <p className="text-sm text-muted-foreground">Memuat orders…</p>}
      {orders.isError && (
        <p className="text-sm text-destructive">Gagal memuat: {orders.error.message}</p>
      )}
      {orders.isSuccess && (
        <>
          <div className="overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="[&>th]:border-b [&>th]:px-3 [&>th]:py-2">
                  <th>No. order</th>
                  <th>Status</th>
                  <th>Rute</th>
                  <th>Jemput (WIB)</th>
                  <th className="text-right">Harga</th>
                </tr>
              </thead>
              <tbody className={orders.isFetching ? 'opacity-60' : undefined}>
                {orders.data.data.map((order) => (
                  <tr key={order.id} className="hover:bg-accent/30 [&>td]:border-b [&>td]:px-3 [&>td]:py-2">
                    <td>
                      <Link
                        to="/partner/orders/$orderId"
                        params={{ orderId: String(order.id) }}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>
                      <Badge variant={statusVariant(order.tripStatus)}>{order.tripStatus}</Badge>
                    </td>
                    <td className="text-muted-foreground">
                      {order.pickupCode} → {order.destinationCode}
                    </td>
                    <td className="whitespace-nowrap">{formatDateTimeWIB(order.pickupAt)}</td>
                    <td className="text-right tabular-nums">{formatRupiah(order.basicPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Halaman {meta?.page} dari {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Halaman sebelumnya"
                disabled={search.page <= 1}
                onClick={() => goto(search.page - 1)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Halaman berikutnya"
                disabled={search.page >= totalPages}
                onClick={() => goto(search.page + 1)}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
