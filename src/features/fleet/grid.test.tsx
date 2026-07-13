import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GojekMonitoringTable } from './components/GojekMonitoringTable';
import { makeGojekGrid } from '@/mocks/fixtures/fleet';
import type { FleetGrid } from './types';

// small grid keeps the component test fast
const grid = makeGojekGrid(6, 2026, 12) as unknown as FleetGrid;

function renderTable(overrides?: Partial<Parameters<typeof GojekMonitoringTable>[0]>) {
  const props = {
    grid,
    onCellClick: vi.fn(),
    ...overrides,
  };
  render(<GojekMonitoringTable {...props} />);
  return props;
}

describe('GojekMonitoringTable (faithful legacy pivot)', () => {
  it('renders the two-row header: identity + Tanggal group + Summary + day numbers', () => {
    renderTable();
    expect(screen.getByText('Rental Partner')).toBeInTheDocument();
    expect(screen.getByText('Driver')).toBeInTheDocument();
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

  it('renders an explicit "0" for in-data-but-Rp0 (pink) days', () => {
    const base = makeGojekGrid(6, 2026, 1) as unknown as FleetGrid;
    const row = {
      ...base.rows[0],
      days: {
        ...base.rows[0].days,
        1: { day: 1, displayAmount: 0, countedAmount: 0, exception: null, detail: null },
      },
    };
    render(
      <GojekMonitoringTable grid={{ ...base, rows: [row] }} onCellClick={vi.fn()} />,
    );
    const zeroCells = screen.getAllByText('0');
    expect(zeroCells.length).toBeGreaterThan(0);
  });

  it('admin layout is a pure sync view: no Region and no Aksi column', () => {
    renderTable();
    expect(screen.getByText('Rental Partner')).toBeInTheDocument();
    expect(screen.queryByText('Region')).not.toBeInTheDocument();
    expect(screen.queryByText('Aksi')).not.toBeInTheDocument();
  });

  it('renders a "Manual Payment tanpa plat" row as a Tanpa Plat badge', () => {
    const base = makeGojekGrid(6, 2026, 3) as unknown as FleetGrid;
    // synthesize an unplated manual-payment row (backend key manual_<detailId>)
    const manualRow: FleetGrid['rows'][number] = {
      ...base.rows[0],
      plateNorm: 'manual_9001',
      plateRaw: '',
      carId: null,
      detailId: 9001,
    };
    const manualGrid: FleetGrid = { ...base, rows: [manualRow, ...base.rows.slice(1)] };
    render(<GojekMonitoringTable grid={manualGrid} onCellClick={vi.fn()} />);
    expect(screen.getByText('Tanpa Plat')).toBeInTheDocument();
  });

  it('partner (readOnly) variant drops Rental Partner, shows Driver, and fires Kelola Jadwal', async () => {
    const user = userEvent.setup();
    const onManageException = vi.fn();
    render(
      <GojekMonitoringTable
        grid={grid}
        onCellClick={vi.fn()}
        onManageException={onManageException}
        readOnly
      />,
    );
    // cross-partner/admin columns are gone in the partner view
    expect(screen.queryByText('Rental Partner')).not.toBeInTheDocument();
    expect(screen.queryByText('Region')).not.toBeInTheDocument();
    expect(screen.getByText('Driver')).toBeInTheDocument();
    // every driver from the row's history is rendered inline
    for (const name of grid.rows[0].driverHistory) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    // the partner keeps a per-row Kelola Jadwal action
    expect(screen.getByText('Aksi')).toBeInTheDocument();
    const firstPlate = grid.rows[0].plateRaw;
    await user.click(screen.getByLabelText(`Kelola jadwal ${firstPlate}`));
    expect(onManageException).toHaveBeenCalledWith(grid.rows[0].plateNorm);
  });
});
