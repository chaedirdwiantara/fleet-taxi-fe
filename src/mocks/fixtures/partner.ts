export const partnerMe = {
  id: 42,
  email: 'ops@bhisa.id',
  fullName: 'Bhisa Operations',
  roles: ['partner'],
  partner: { id: 7, code: 'BHISA', name: 'Bhisa Shuttle', type: 'shuttle' },
};

export const adminMe = {
  id: 1,
  email: 'admin@fleet-taxi.id',
  fullName: 'Fleet Admin',
  roles: ['admin'],
  partner: null,
};

export const partnerDashboard = {
  totalOrders: 1_284,
  ordersThisMonth: 96,
  revenueThisMonth: 48_250_000,
  ordersByDay: Array.from({ length: 14 }, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, '0')}`,
    count: 3 + ((i * 7) % 9),
  })),
  ordersByStatus: [
    { status: 'submitted', count: 24 },
    { status: 'completed', count: 60 },
    { status: 'cancelled', count: 12 },
  ],
};

export const orders = Array.from({ length: 120 }, (_, i) => ({
  id: i + 1,
  orderNumber: `ORD-2026-${String(i + 1).padStart(5, '0')}`,
  orderType: 'later',
  tripStatus: ['submitted', 'completed', 'cancelled'][i % 3],
  pickupCode: 'EVISTA_HALIM',
  destinationCode: 'BHISA_CAWANG',
  carTypesId: 1,
  pickupAt: `2026-06-${String((i % 28) + 1).padStart(2, '0')}T0${i % 9}:30:00Z`,
  basicPrice: 150_000 + (i % 5) * 25_000,
  passengerDetails: null,
  createdAt: `2026-06-${String((i % 28) + 1).padStart(2, '0')}T02:00:00Z`,
}));
