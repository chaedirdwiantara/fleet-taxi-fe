import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';

// Rental Monitoring seeds. Dates are anchored to the CURRENT WIB month so the
// page (whose default filter is the current period) shows data out of the box
// in dev and tests. Plates match seedPartnerPlates (fixtures/partner.ts).

export type SeedRental = {
  id: number;
  plateNumber: string;
  vehicleType: string | null;
  region: string | null;
  startDate: string;
  endDate: string;
  pricePerDay: number;
  cogsPerDay: number;
  cogsType: string | null;
  additionalCost: number;
  additionalCostDescription: string | null;
  deposit: number;
  rentalType: 'Dengan Driver' | 'Lepas Kunci' | null;
  infoSource: string | null;
  serviceArea: string | null;
  customerName: string | null;
  customerPhone: string | null;
  paymentStatus: 'Belum Dibayar' | 'Sudah Dibayar';
  createdAt: string;
  updatedAt: string;
};

const mm = String(currentMonthWIB()).padStart(2, '0');
const yyyy = currentYearWIB();
const d = (day: number) => `${yyyy}-${mm}-${String(day).padStart(2, '0')}`;

export const seedRentals: SeedRental[] = [
  {
    id: 1,
    plateNumber: 'B 1000 XYZ',
    vehicleType: 'Premium - BYD M6',
    region: 'Jakarta',
    startDate: d(5),
    endDate: d(8),
    pricePerDay: 900_000,
    cogsPerDay: 250_000,
    cogsType: 'm6_cloud',
    additionalCost: 100_000,
    additionalCostDescription: 'Antar jemput bandara',
    deposit: 500_000,
    rentalType: 'Lepas Kunci',
    infoSource: 'Tiktok',
    serviceArea: 'Jabodetabek',
    customerName: 'Andi Saputra',
    customerPhone: '081234567890',
    paymentStatus: 'Sudah Dibayar',
    createdAt: `${yyyy}-${mm}-04T03:00:00.000Z`,
    updatedAt: `${yyyy}-${mm}-04T03:00:00.000Z`,
  },
  {
    id: 2,
    plateNumber: 'B 1001 XYZ',
    vehicleType: 'Reguler - Avanza',
    region: 'Jakarta',
    startDate: d(10),
    endDate: d(12),
    pricePerDay: 450_000,
    cogsPerDay: 175_000,
    cogsType: 'binguo_neta',
    additionalCost: 0,
    additionalCostDescription: null,
    deposit: 300_000,
    rentalType: 'Dengan Driver',
    infoSource: 'Instagram',
    serviceArea: 'Jakarta Selatan',
    customerName: 'Siti Rahma',
    customerPhone: '081298765432',
    paymentStatus: 'Belum Dibayar',
    createdAt: `${yyyy}-${mm}-09T03:00:00.000Z`,
    updatedAt: `${yyyy}-${mm}-09T03:00:00.000Z`,
  },
  {
    id: 3,
    plateNumber: 'B 2000 GRB',
    vehicleType: 'Reguler - Xenia',
    region: 'Bandung',
    startDate: d(2),
    endDate: d(3),
    pricePerDay: 400_000,
    cogsPerDay: 150_000,
    cogsType: 'air_ev',
    additionalCost: 50_000,
    additionalCostDescription: 'Bensin tambahan',
    deposit: 0,
    rentalType: 'Dengan Driver',
    infoSource: 'Existing Customer',
    serviceArea: 'Bandung Kota',
    customerName: 'Budi Hartono',
    customerPhone: '081377788899',
    paymentStatus: 'Sudah Dibayar',
    createdAt: `${yyyy}-${mm}-01T03:00:00.000Z`,
    updatedAt: `${yyyy}-${mm}-01T03:00:00.000Z`,
  },
];

export const seedCogsDefaults = [
  { key: 'denza', label: 'Denza D9', cogsPerDay: 350_000 },
  { key: 'ioniq', label: 'Hyundai Ioniq 5', cogsPerDay: 300_000 },
  { key: 'air_ev', label: 'Wuling Air EV', cogsPerDay: 150_000 },
  { key: 'm6_cloud', label: 'BYD M6 / Wuling Cloud', cogsPerDay: 250_000 },
  { key: 'seal', label: 'BYD Seal', cogsPerDay: 300_000 },
  { key: 'binguo_neta', label: 'Binguo / Neta', cogsPerDay: 175_000 },
  { key: 'darion', label: 'Darion', cogsPerDay: 200_000 },
];
