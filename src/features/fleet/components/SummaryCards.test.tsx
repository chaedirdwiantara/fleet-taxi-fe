import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SummaryCards } from './SummaryCards';
import type { DayFilterSummary, ExitedDriver, GlobalSummary } from '../types';

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

describe('SummaryCards — Tanggal filter (dayFilter)', () => {
  const dayFilter: DayFilterSummary = {
    day: 15,
    cumulative: {
      totalDeduction: 600_000,
      totalDue: 700_000,
      totalOutstanding: 90_000,
      totalOutstandingMonth: 40_000,
    },
    selectedDay: { totalDeduction: 45_000 },
  };

  it('shows cumulative-to-day headlines plus the selected day’s own setoran', () => {
    render(<SummaryCards summary={summary} dayFilter={dayFilter} />);
    // cumulative headlines replace the whole-month figures
    expect(screen.getByText('Rp 600.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 700.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 90.000')).toBeInTheDocument();
    // the selected day's own setoran as a secondary line
    expect(screen.getByText('Tanggal 15: Rp 45.000')).toBeInTheDocument();
    expect(screen.getByText('Kumulatif s/d tanggal 15')).toBeInTheDocument();
    // outstanding caption is scoped to the cutoff day
    expect(screen.getByText(/Bulan ini \(s\/d tgl 15\): \+Rp 40\.000/)).toBeInTheDocument();
    // Driver Keluar card is all-time — unchanged by the filter
    expect(screen.getByText('Rp 50.000')).toBeInTheDocument();
  });

  it('renders whole-month figures untouched without dayFilter', () => {
    render(<SummaryCards summary={{ ...summary, totalOutstandingMonth: 40_000 }} />);
    expect(screen.getByText('Rp 1.000.000')).toBeInTheDocument();
    expect(screen.getByText(/Bulan ini: \+Rp 40\.000/)).toBeInTheDocument();
    expect(screen.queryByText(/s\/d tanggal/)).toBeNull();
  });
});
