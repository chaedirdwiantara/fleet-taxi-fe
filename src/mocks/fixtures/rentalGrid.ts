// Rental Monitoring pivot mock. Built the way the backend builds it
// (partner-rentals/rental-grid.ts): spread each booking over the days of the
// month with the SAME rule the recap uses — price/day every day, additionalCost
// once on the first clipped day — so the mock cannot promise a figure or an
// invariant the real endpoint does not honor.
import { daysInMonth } from './fleet';
import type { SeedRental } from './rental';

type RegisteredPlate = { plateNumber: string; plateNumberNorm: string; vehicleType: string | null };

type MockRentalGridDay = { amount: number; paymentStatus: string; rentalId: number };
type MockRentalGridTotals = { omset: number; cogs: number; nett: number; rentedDays: number };
type MockRentalGridRow = {
  plateNorm: string;
  plateNumber: string;
  vehicleType: string | null;
  region: string | null;
  days: Record<number, MockRentalGridDay>;
  bookings: {
    id: number;
    customerName: string | null;
    displayStartDate: string;
    displayEndDate: string;
    days: number;
    omset: number;
    cogsTotal: number;
    nettProfit: number;
    paymentStatus: string;
    rentalType: string | null;
  }[];
  totals: MockRentalGridTotals;
};

const UNPAID = 'Belum Dibayar';
const normalizePlate = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
const emptyTotals = (): MockRentalGridTotals => ({ omset: 0, cogs: 0, nett: 0, rentedDays: 0 });
const dayCount = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

/** Month-clipped range of a booking, or null when it misses the month. */
function clip(rental: SeedRental, month: number, year: number) {
  const mm = String(month).padStart(2, '0');
  const start = `${year}-${mm}-01`;
  const end = `${year}-${mm}-${String(daysInMonth(month, year)).padStart(2, '0')}`;
  const from = rental.startDate < start ? start : rental.startDate;
  const to = rental.endDate > end ? end : rental.endDate;
  return to < from ? null : { from, to };
}

export function makeRentalGrid(
  month: number,
  year: number,
  bookings: SeedRental[],
  registered: RegisteredPlate[],
) {
  const dim = daysInMonth(month, year);
  const byPlate = new Map<string, MockRentalGridRow & { latestStart: string }>();

  const emptyRow = (plate: RegisteredPlate) => ({
    plateNorm: plate.plateNumberNorm,
    plateNumber: plate.plateNumber,
    vehicleType: plate.vehicleType,
    region: null,
    days: {},
    bookings: [],
    totals: emptyTotals(),
    latestStart: '',
  });

  for (const plate of registered) byPlate.set(plate.plateNumberNorm, emptyRow(plate));

  for (const booking of bookings) {
    const range = clip(booking, month, year);
    if (!range) continue;
    const norm = normalizePlate(booking.plateNumber);

    let row = byPlate.get(norm);
    if (!row) {
      row = emptyRow({
        plateNumber: booking.plateNumber,
        plateNumberNorm: norm,
        vehicleType: booking.vehicleType,
      });
      byPlate.set(norm, row);
    }
    if (booking.startDate >= row.latestStart) {
      row.latestStart = booking.startDate;
      row.plateNumber = booking.plateNumber;
      row.vehicleType = booking.vehicleType ?? row.vehicleType;
      row.region = booking.region;
    }

    const days = dayCount(range.from, range.to);
    const gross = booking.pricePerDay * days;
    const cogsTotal = booking.cogsPerDay * days;
    row.bookings.push({
      id: booking.id,
      customerName: booking.customerName,
      displayStartDate: range.from,
      displayEndDate: range.to,
      days,
      omset: gross + booking.additionalCost,
      cogsTotal,
      nettProfit: gross - cogsTotal - booking.additionalCost,
      paymentStatus: booking.paymentStatus,
      rentalType: booking.rentalType,
    });
    row.totals.omset += gross + booking.additionalCost;
    row.totals.cogs += cogsTotal;
    row.totals.nett += gross - cogsTotal - booking.additionalCost;

    const firstDay = Number(range.from.slice(8, 10));
    const lastDay = Number(range.to.slice(8, 10));
    for (let day = firstDay; day <= lastDay; day++) {
      const existing = row.days[day];
      if (!existing) row.totals.rentedDays += 1;
      row.days[day] = {
        amount:
          (existing?.amount ?? 0) +
          booking.pricePerDay +
          (day === firstDay ? booking.additionalCost : 0),
        paymentStatus: existing?.paymentStatus === UNPAID ? UNPAID : booking.paymentStatus,
        rentalId: existing?.rentalId ?? booking.id,
      };
    }
  }

  const rows = [...byPlate.values()]
    .map(({ latestStart, ...row }) => {
      void latestStart;
      row.bookings.sort((a, b) => a.displayStartDate.localeCompare(b.displayStartDate));
      return row;
    })
    .sort((a, b) => b.totals.omset - a.totals.omset || a.plateNorm.localeCompare(b.plateNorm));

  const dailyTotals: Record<number, number> = {};
  const totals = emptyTotals();
  for (const row of rows) {
    for (const [dayKey, cell] of Object.entries(row.days)) {
      dailyTotals[Number(dayKey)] = (dailyTotals[Number(dayKey)] ?? 0) + cell.amount;
    }
    totals.omset += row.totals.omset;
    totals.cogs += row.totals.cogs;
    totals.nett += row.totals.nett;
    totals.rentedDays += row.totals.rentedDays;
  }

  return {
    month,
    year,
    daysInMonth: dim,
    rows,
    dailyTotals,
    totals,
    plateCount: rows.length,
    activeCount: rows.filter((r) => r.totals.rentedDays > 0).length,
  };
}
