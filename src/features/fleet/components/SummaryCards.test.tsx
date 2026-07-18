import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SummaryCards } from './SummaryCards';
import type { ExitedDriver, GlobalSummary } from '../types';

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
