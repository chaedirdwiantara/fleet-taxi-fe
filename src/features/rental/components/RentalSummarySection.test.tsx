import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RentalSummarySection } from './RentalSummarySection';
import type { RentalNettByType, RentalSummary } from '../types';

// "Nett per Tipe" grows by one row per COGS preset the partner uses, and it used
// to sit beside the stat cards where that growth opened a widening hole under
// them. Full width + a capped preview is what bounds it, so that cap is the
// thing worth pinning.
const summary: RentalSummary = {
  totalTransactions: 24,
  unpaidTransactions: 5,
  unpaidGross: 33_889_984,
  paidGross: 134_779_040,
  paidCogs: 99_207_766,
  paidAdditionalCost: 0,
  paidNettProfit: 35_571_274,
  paidPpn: 14_825_695,
  paidTotalBilled: 149_604_735,
  unpaidPpn: 0,
};

const nettRow = (cogsType: string, nett: number): RentalNettByType => ({
  cogsType,
  gross: nett * 2,
  cogs: nett,
  nett,
  count: 1,
});

// Descending by nett, the order the backend returns.
const manyTypes = Array.from({ length: 9 }, (_, i) => nettRow(`tipe_${i + 1}`, 9_000_000 - i));

const nettPanel = () =>
  screen.getByText('Nett per Tipe').closest('[data-slot="card"]') as HTMLElement;
const nettList = () => within(nettPanel()).getByRole('list');

describe('RentalSummarySection', () => {
  it('shows every headline figure in full, including nine-digit rupiah', () => {
    render(<RentalSummarySection summary={summary} nettByType={[]} />);

    expect(screen.getByText('Rp 134.779.040')).toBeInTheDocument();
    expect(screen.getByText('Rp 99.207.766')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument(); // a count, not rupiah
    expect(screen.getByText('5 transaksi belum dibayar')).toBeInTheDocument();
  });

  it('hides the PPN card until VAT is actually in play', () => {
    const { rerender } = render(
      <RentalSummarySection summary={{ ...summary, paidPpn: 0, unpaidPpn: 0 }} nettByType={[]} />,
    );
    expect(screen.queryByText('PPN Terutang')).not.toBeInTheDocument();

    rerender(<RentalSummarySection summary={summary} nettByType={[]} />);
    expect(screen.getByText('PPN Terutang')).toBeInTheDocument();
  });

  it('caps the breakdown at the top six types and folds the rest behind a toggle', async () => {
    const user = userEvent.setup();
    render(<RentalSummarySection summary={summary} nettByType={manyTypes} />);

    expect(within(nettPanel()).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('tipe_1')).toBeInTheDocument();
    expect(screen.queryByText('tipe_7')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Tampilkan 3 tipe lainnya/ }));
    expect(within(nettPanel()).getAllByRole('listitem')).toHaveLength(9);
    expect(screen.getByText('tipe_9')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /6 teratas saja/ }));
    expect(within(nettPanel()).getAllByRole('listitem')).toHaveLength(6);
  });

  it('leaves the panel flat when there is nothing to fold', () => {
    render(<RentalSummarySection summary={summary} nettByType={manyTypes.slice(0, 4)} />);

    expect(within(nettPanel()).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /Tampilkan/ })).not.toBeInTheDocument();
  });

  it('totals the WHOLE breakdown in the header, not just the visible preview', () => {
    render(<RentalSummarySection summary={summary} nettByType={manyTypes} />);

    // Σ of all nine rows — a header total that only covered the preview would
    // quietly under-report the month.
    const total = manyTypes.reduce((sum, row) => sum + row.nett, 0);
    expect(
      within(nettPanel()).getByText(`Rp ${total.toLocaleString('id-ID')}`),
    ).toBeInTheDocument();
    expect(screen.getByText('9 tipe')).toBeInTheDocument();
  });

  it('reads a loss as destructive rather than as revenue', () => {
    render(
      <RentalSummarySection
        summary={summary}
        nettByType={[nettRow('laba', 2_000_000), nettRow('rugi', -500_000)]}
      />,
    );

    expect(within(nettList()).getByText('-Rp 500.000')).toHaveClass('text-destructive');
    expect(within(nettList()).getByText('Rp 2.000.000')).not.toHaveClass('text-destructive');
  });

  it('says so when no transaction has been settled yet', () => {
    render(<RentalSummarySection summary={summary} nettByType={[]} />);

    expect(screen.getByText('Belum ada data paid')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
