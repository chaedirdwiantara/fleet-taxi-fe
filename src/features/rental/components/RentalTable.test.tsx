import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { RentalTable } from './RentalTable';
import type { RentalItem } from '../types';

// The month view clips a booking's figures to the month; the date cell must
// still tell the truth about the whole booking, which is what the invoice bills.
const item = (overrides: Partial<RentalItem>): RentalItem => ({
  id: 1,
  plateNumber: 'B 2847 SNF',
  vehicleType: 'BYD ATTO 1',
  region: null,
  startDate: '2026-09-01',
  endDate: '2026-09-04',
  displayStartDate: '2026-09-01',
  displayEndDate: '2026-09-04',
  days: 4,
  pricePerDay: 266_667,
  cogsPerDay: 166_666,
  cogsType: null,
  additionalCost: 0,
  additionalCostDescription: null,
  deposit: 0,
  rentalType: 'Lepas Kunci',
  infoSource: null,
  serviceArea: null,
  customerName: 'Timothy',
  customerPhone: null,
  paymentStatus: 'Sudah Dibayar',
  paymentProofs: [],
  gross: 1_066_668,
  cogsTotal: 666_664,
  nettProfit: 400_004,
  omset: 1_066_668,
  ppnRateBps: 1100,
  ppnBase: 1_066_668,
  ppnAmount: 117_333,
  totalBilled: 1_184_001,
  createdAt: '2026-08-05T03:00:00.000Z',
  updatedAt: '2026-08-05T03:00:00.000Z',
  ...overrides,
});

const renderTable = (items: RentalItem[]) =>
  render(
    <RentalTable
      items={items}
      onEdit={vi.fn()}
      onPaymentClick={vi.fn()}
      onInvoice={vi.fn()}
      invoicePendingId={null}
      onDelete={vi.fn()}
      deletePending={false}
    />,
  );

describe('RentalTable — booked range vs. the month slice', () => {
  it('names the full booking and how many of its days fall in this month', () => {
    // A 31-day rental viewed in September: only 1–4 Sep are counted here.
    renderTable([item({ startDate: '2026-08-05', endDate: '2026-09-04' })]);
    const row = screen.getByText('B 2847 SNF').closest('tr')!;
    expect(within(row).getByText('5 Agu 2026 – 4 Sep 2026')).toBeInTheDocument();
    expect(within(row).getByText('31 Hari')).toBeInTheDocument();
    expect(within(row).getByText('4 hari di Sep 2026')).toBeInTheDocument();
  });

  it('adds no caption when the booking sits entirely inside the month', () => {
    renderTable([item({})]);
    const row = screen.getByText('B 2847 SNF').closest('tr')!;
    expect(within(row).getByText('1 Sep 2026 – 4 Sep 2026')).toBeInTheDocument();
    expect(within(row).getByText('4 Hari')).toBeInTheDocument();
    expect(within(row).queryByText(/hari di/)).not.toBeInTheDocument();
  });
});
