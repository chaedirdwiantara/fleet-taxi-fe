import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { RentalDailyGridPage } from './RentalDailyGridPage';
import { rentalGridSearchSchema, type RentalGridSearch } from './gridSearchSchema';
import { dayTone, formatUtilization, isClickable, toneClass } from './lib/rentalDayTone';
import { resetPartnerPlates, resetPartnerRentals } from '@/mocks/handlers';
import type { RentalGridDayCell } from './types';

// The page pulls <Link> from the router (shortcut to Rental Management); a plain
// anchor keeps it renderable outside a RouterProvider — same approach as
// features/deposit-installment/cop.test.tsx.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

// Radix Select (MonthYearPicker) needs pointer APIs jsdom lacks.
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLElement.prototype.hasPointerCapture = () => false;
window.HTMLElement.prototype.releasePointerCapture = () => {};

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

function Harness() {
  const [search, setSearch] = useState<RentalGridSearch>(() => rentalGridSearchSchema.parse({}));
  return (
    <RentalDailyGridPage
      search={search}
      onPatch={(patch) => setSearch((prev) => ({ ...prev, ...patch }))}
    />
  );
}

const renderPage = () => render(<Harness />, { wrapper: wrapperFor(makeClient()) });
const grid = () => within(screen.getByRole('table'));

const cell = (over: Partial<RentalGridDayCell> = {}): RentalGridDayCell => ({
  amount: 450_000,
  paymentStatus: 'Belum Dibayar',
  rentalId: 1,
  ...over,
});

beforeEach(() => {
  resetPartnerPlates();
  resetPartnerRentals();
});

describe('rentalDayTone', () => {
  it('reads a cell by whether the money has arrived', () => {
    expect(dayTone(cell({ paymentStatus: 'Sudah Dibayar' }))).toBe('paid');
    expect(dayTone(cell())).toBe('unpaid');
    expect(dayTone(undefined)).toBe('idle');
  });

  it('keeps each tone distinct in both themes', () => {
    expect(toneClass('paid')).toContain('text-green-700');
    expect(toneClass('paid')).toContain('dark:text-green-300');
    expect(toneClass('unpaid')).toContain('text-amber-800');
    expect(toneClass('idle')).toContain('dark:bg-slate-900');
  });

  it('opens only on a day that actually has a booking', () => {
    expect(isClickable(cell())).toBe(true);
    expect(isClickable(undefined)).toBe(false);
  });

  it('reports utilisation as rented days over the days available', () => {
    expect(formatUtilization(0, 31)).toBe('0%');
    expect(formatUtilization(31, 31)).toBe('100%');
    expect(formatUtilization(12, 31)).toBe('39%');
    // no days available cannot divide by zero
    expect(formatUtilization(0, 0)).toBe('0%');
  });
});

describe('Rental Monitoring grid', () => {
  it('lists every plate over the month with its omset, rented days and utilisation', async () => {
    renderPage();
    await screen.findByText('Ringkasan Bulan Ini');

    // seeded bookings sit on these plates…
    expect(grid().getByText('B 1000 XYZ')).toBeInTheDocument();
    expect(grid().getByText('B 1001 XYZ')).toBeInTheDocument();
    // …and the day band covers the whole month
    expect(grid().getByRole('columnheader', { name: '1' })).toBeInTheDocument();
    expect(grid().getByText(/Utilisasi/)).toBeInTheDocument();
    expect(grid().getByText('TOTAL')).toBeInTheDocument();
  });

  it('colors a day by payment status, and leaves idle days neutral', async () => {
    renderPage();
    await screen.findByText('Ringkasan Bulan Ini');

    const cells = grid().getAllByRole('button', { name: /tanggal \d+/ });
    const paid = cells.filter((c) => c.className.includes('text-green-700'));
    const unpaid = cells.filter((c) => c.className.includes('text-amber-800'));

    expect(paid.length).toBeGreaterThan(0);
    expect(unpaid.length).toBeGreaterThan(0);
    // the status is in the accessible name too, not only in the colour
    expect(paid[0].getAttribute('aria-label')).toMatch(/Sudah Dibayar$/);
    expect(unpaid[0].getAttribute('aria-label')).toMatch(/Belum Dibayar$/);
  });

  it('opens the booking behind a cell, without a second request', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ringkasan Bulan Ini');

    const [firstCell] = grid().getAllByRole('button', { name: /tanggal \d+/ });
    await user.click(firstCell);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Rincian Sewa')).toBeInTheDocument();
    expect(within(dialog).getByText('Omset hari ini')).toBeInTheDocument();
    expect(within(dialog).getByText('Penyewa')).toBeInTheDocument();
  });

  it('shows a registered plate that was never rented as idle, not as missing', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

    // Every registered plate gets a row; the seeds rent all three, so the row
    // count is what proves idle plates are seeded rather than filtered out.
    const badge = await screen.findByText(/\d+ plat/);
    expect(badge).toBeInTheDocument();
    expect(screen.getByText(/\d+ tersewa/)).toBeInTheDocument();
    expect(screen.getByText(/Utilisasi armada/)).toBeInTheDocument();
  });

  it('explains the legend and where the figures come from', async () => {
    renderPage();
    await screen.findByText('Ringkasan Bulan Ini');

    expect(screen.getByText('Legenda:')).toBeInTheDocument();
    expect(screen.getByText('(omset sudah diterima)')).toBeInTheDocument();
    expect(screen.getByText('(masih tertagih)')).toBeInTheDocument();
    expect(screen.getByText(/Klik sel untuk rincian sewanya/)).toBeInTheDocument();
    expect(screen.getByText(/PPN tidak termasuk/)).toBeInTheDocument();
  });
});
