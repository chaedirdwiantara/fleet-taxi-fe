import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { AllFleetMonitoringPage } from './AllFleetMonitoringPage';
import { fleetSearchSchema, type FleetSearch } from '@/features/fleet/searchSchema';
import { resetPartnerPlates, resetPartnerRentals } from '@/mocks/handlers';

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

// The route normally owns the URL search state; the harness emulates it so the
// page's onPatch round-trips like navigate({ search }) would.
function Harness() {
  const [search, setSearch] = useState<FleetSearch>(() => fleetSearchSchema.parse({}));
  return (
    <AllFleetMonitoringPage
      search={search}
      onPatch={(patch) => setSearch((prev) => ({ ...prev, ...patch }))}
    />
  );
}

const renderPage = () => render(<Harness />, { wrapper: wrapperFor(makeClient()) });

// "TOTAL" and "Tanpa driver" also appear in the explanatory copy below the
// matrix, so table assertions are scoped to the table itself.
const matrix = () => within(screen.getByRole('table'));

/** Rp figures inside the TOTAL footer row, in column order. */
const footerTotals = () => {
  const row = matrix().getByRole('cell', { name: 'TOTAL' }).closest('tr')!;
  return within(row)
    .getAllByText(/^Rp/)
    .map((el) => el.textContent);
};

beforeEach(() => {
  resetPartnerPlates();
  resetPartnerRentals();
});

describe('All Fleet Monitoring', () => {
  it('shows the combined matrix with per-source totals and a TOTAL row', async () => {
    renderPage();

    expect(await screen.findByText('All Fleet Monitoring')).toBeInTheDocument();
    // per-source cards
    expect(await screen.findByText('Total Pemasukan')).toBeInTheDocument();
    expect(screen.getByText('Gojek (Setoran)')).toBeInTheDocument();
    expect(screen.getByText('Grab (Earning)')).toBeInTheDocument();
    expect(screen.getByText('Rental (Omset)')).toBeInTheDocument();
    // matrix header: identity + the day band + the per-source summary block
    expect(screen.getByText('Pemasukan per Sumber')).toBeInTheDocument();
    expect(screen.getByText(/Tanggal \(/)).toBeInTheDocument();
    expect(matrix().getByRole('cell', { name: 'TOTAL' })).toBeInTheDocument();
    // every source column carries a figure in the footer
    expect(footerTotals().length).toBeGreaterThanOrEqual(4);
  });

  it('names the plate as the subject and the driver as its mirror column', async () => {
    renderPage();
    await screen.findByText('Pemasukan per Sumber');

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toContain('Plat');
    expect(headers).toContain('Driver');
    expect(screen.getByText(/Pemasukan tiap plat per tanggal/)).toBeInTheDocument();
  });

  it('switching to By Driver swaps the subject and keeps the grand total identical', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Pemasukan per Sumber');
    const plateModeTotals = footerTotals();

    await user.click(screen.getByRole('radio', { name: /By Driver/ }));

    await waitFor(() =>
      expect(screen.getByText(/Pemasukan tiap driver per tanggal/)).toBeInTheDocument(),
    );
    // subject/mirror columns swap places…
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toContain('Driver');
    expect(headers).toContain('Plat');
    // …and regrouping does not change the money
    await waitFor(() => expect(footerTotals()).toEqual(plateModeTotals));
  });

  it('parks Rental omset in a "Tanpa driver" row when reading per driver', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Pemasukan per Sumber');
    // plate mode attributes rental to its plate, so there is no residual row
    expect(matrix().queryByText('Tanpa driver')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /By Driver/ }));

    await waitFor(() => expect(matrix().getByText('Tanpa driver')).toBeInTheDocument());
    expect(matrix().getByText('tidak terpetakan')).toBeInTheDocument();
    // and the legend explains why
    expect(screen.getByText(/Rental Monitoring tidak mencatat driver/)).toBeInTheDocument();
  });

  it('clicking a cell opens the per-source drill-down for that day', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Pemasukan per Sumber');

    const [firstCell] = screen.getAllByRole('button', { name: /tanggal \d+: Rp/ });
    await user.click(firstCell);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Rincian Transaksi')).toBeInTheDocument();
    expect(within(dialog).getByText('Total hari ini')).toBeInTheDocument();
  });

  it('explains the color legend and the click affordance', async () => {
    renderPage();
    await screen.findByText('Pemasukan per Sumber');

    expect(screen.getByText('Legenda:')).toBeInTheDocument();
    expect(screen.getByText('Gabungan')).toBeInTheDocument();
    expect(screen.getByText('(lebih dari satu sumber)')).toBeInTheDocument();
    expect(screen.getByText(/Klik sel untuk rincian/)).toBeInTheDocument();
  });
});
