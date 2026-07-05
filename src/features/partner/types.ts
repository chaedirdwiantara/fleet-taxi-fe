// Partner portal (§6.2) — everything is server-scoped to the session's
// partner; the client never sends a partnerId (guardrail §11).

export type Order = {
  id: number;
  orderNumber: string;
  orderType: string;
  tripStatus: string;
  pickupCode: string;
  destinationCode: string;
  carTypesId: number;
  pickupAt: string; // UTC ISO — display in WIB
  basicPrice: number; // integer rupiah
  passengerDetails: Record<string, unknown> | null;
  createdAt: string;
};

export type PartnerDashboard = {
  totalOrders: number;
  ordersThisMonth: number;
  revenueThisMonth: number; // integer rupiah
  ordersByDay: { date: string; count: number }[];
  ordersByStatus: { status: string; count: number }[];
};

export type ExportFormat = 'pdf' | 'xlsx';
