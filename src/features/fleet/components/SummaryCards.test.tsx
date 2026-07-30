import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SummaryCards } from './SummaryCards';
import type { ExitedDriver, GlobalSummary, RangeSummary } from '../types';

const summary: GlobalSummary = {
  totalDeduction: 1_000_000,
  totalDue: 1_200_000,
  totalOutstanding: 150_000,
  outstandingDriverKeluar: 50_000,
  exitedCount: 1,
};

const exitedDrivers: ExitedDriver[] = [
  { driverName: 'BUDI SANTOSO', plate: 'B1005XYZ', lastSeen: '2026-07-11', outstanding: 50_000 },
];

describe('SummaryCards — Outstanding Driver Keluar card', () => {
  it('opens the per-driver debt list when the card is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SummaryCards summary={summary} exitedDrivers={exitedDrivers} lastImportDate="2026-07-16" />,
    );

    await user.click(screen.getByRole('button', { name: /Outstanding Driver Keluar/ }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('BUDI SANTOSO');
    expect(dialog).toHaveTextContent('B1005XYZ');
    expect(dialog).toHaveTextContent(/data terakhir: 16 Jul 2026/);
    // row amount + TOTAL footer inside the dialog (single driver → twice)
    expect(within(dialog).getAllByText('Rp 50.000')).toHaveLength(2);
  });

  it('renders a plain (non-clickable) card when no list is provided', () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.queryByRole('button', { name: /Outstanding Driver Keluar/ })).toBeNull();
    expect(screen.getByText('Outstanding Driver Keluar')).toBeInTheDocument();
  });
});

describe('SummaryCards — Tanggal range filter', () => {
  const range: RangeSummary = {
    fromDate: '2026-07-25',
    toDate: '2026-08-05',
    days: 12,
    totalDeduction: 600_000,
    totalDue: 700_000,
    outstandingAsOf: 90_000,
    outstandingDelta: 40_000,
    charts: { daily: [], byPartner: [] },
  };

  it('reports the range as a period, and outstanding as a balance at its end', () => {
    render(<SummaryCards summary={summary} range={range} />);
    // period figures replace the whole-month ones
    expect(screen.getByText('Rp 600.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 700.000')).toBeInTheDocument();
    // ...and the balance is captioned with the date it was read at
    expect(screen.getByText('Rp 90.000')).toBeInTheDocument();
    expect(screen.getByText(/Posisi s\/d 5 Agu 2026/)).toBeInTheDocument();
    // the range is spelled out, crossing the month boundary
    expect(screen.getByText('Rentang 25 Jul – 5 Agu 2026 · 12 hari')).toBeInTheDocument();
    expect(screen.getByText(/Rentang ini: \+Rp 40\.000 \(nambah\)/)).toBeInTheDocument();
    // Driver Keluar card is all-time — unchanged by the filter
    expect(screen.getByText('Rp 50.000')).toBeInTheDocument();
  });

  it('renders whole-month figures untouched without a range', () => {
    render(<SummaryCards summary={{ ...summary, totalOutstandingMonth: 40_000 }} />);
    expect(screen.getByText('Rp 1.000.000')).toBeInTheDocument();
    expect(screen.getByText(/Bulan ini: \+Rp 40\.000/)).toBeInTheDocument();
    expect(screen.queryByText(/Rentang/)).toBeNull();
    // the Target card explains where its number comes from
    expect(
      screen.getByText('Dari baris due yang terimpor — hari tanpa data tidak ditagih'),
    ).toBeInTheDocument();
  });
});
