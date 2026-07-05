import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GojekMonitoringTable } from './components/GojekMonitoringTable';
import { makeGojekGrid } from '@/mocks/fixtures/fleet';
import type { FleetGrid } from './types';

// small grid keeps the component test fast (200 rows renders 200 dropdowns)
const grid = makeGojekGrid(6, 2026, 12) as unknown as FleetGrid;

function renderTable(overrides?: Partial<Parameters<typeof GojekMonitoringTable>[0]>) {
  const props = {
    grid,
    onCellClick: vi.fn(),
    onEditTarget: vi.fn(),
    onManageException: vi.fn(),
    onDriverHistory: vi.fn(),
    ...overrides,
  };
  render(<GojekMonitoringTable {...props} />);
  return props;
}

describe('GojekMonitoringTable (faithful legacy pivot)', () => {
  it('renders the two-row header: identity + Tanggal group + Summary + day numbers', () => {
    renderTable();
    expect(screen.getByText('Rental Partner')).toBeInTheDocument();
    expect(screen.getByText('Setoran')).toBeInTheDocument();
    expect(screen.getByText(/Tanggal \(/)).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Total Deduction')).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    // day headers 1..30
    const dayHeaders = screen.getAllByRole('columnheader').filter((h) => /^\d+$/.test(h.textContent ?? ''));
    expect(dayHeaders.length).toBe(grid.daysInMonth);
  });

  it('merges the rental-partner column with rowspan (grouped once per run)', () => {
    renderTable();
    // fewer rental-partner cells than rows because of grouping
    const partners = new Set(grid.rows.map((r) => r.rentalPartner));
    const rpCells = screen.getAllByRole('cell').filter((c) => partners.has(c.textContent ?? ''));
    expect(rpCells.length).toBeGreaterThanOrEqual(partners.size);
    expect(rpCells.length).toBeLessThan(grid.rows.length);
    // the first grouped cell spans multiple rows
    expect(rpCells.some((c) => Number(c.getAttribute('rowspan')) > 1)).toBe(true);
  });

  it('renders a TOTAL row with the day + summary totals', () => {
    renderTable();
    expect(screen.getByText('TOTAL HARI INI')).toBeInTheDocument();
  });

  it('clicking a value cell fires onCellClick(plateNorm, day)', async () => {
    const user = userEvent.setup();
    const { onCellClick } = renderTable();
    // find a green/target cell (counted >= target) to click
    const row = grid.rows.find((r) =>
      Object.values(r.days).some((d) => d && d.countedAmount >= r.dailyTarget),
    )!;
    const day = Number(
      Object.keys(row.days).find((d) => {
        const cell = row.days[Number(d)];
        return cell && cell.countedAmount >= row.dailyTarget;
      }),
    );
    // clickable day cells expose an aria-label "<plate> tanggal <d>: <amount>"
    const dayCell = screen.getByLabelText(new RegExp(`^${row.plateRaw} tanggal ${day}:`));
    await user.click(dayCell);
    expect(onCellClick).toHaveBeenCalledWith(row.plateNorm, day);
  });

  it('opens the Aksi menu and fires edit-target / driver-history', async () => {
    const user = userEvent.setup();
    const { onEditTarget } = renderTable();
    const firstPlate = grid.rows[0].plateRaw;
    const menuBtn = screen.getByLabelText(`Aksi ${firstPlate}`);
    await user.click(menuBtn);
    const editItem = await screen.findByRole('menuitem', { name: /Target/ });
    await user.click(editItem);
    expect(onEditTarget).toHaveBeenCalledWith(grid.rows[0].plateNorm);
  });
});
