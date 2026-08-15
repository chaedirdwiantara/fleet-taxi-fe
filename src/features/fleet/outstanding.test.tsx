import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OutstandingModal } from './components/OutstandingModal';
import { RawDataPanel } from './components/RawDataPanel';
import type { OutstandingBreakdown, RawManualRow } from './types';

const breakdown: OutstandingBreakdown = {
  parts: [
    {
      label: 'BUDI SANTOSO',
      due: 10_088_000,
      paid: 9_897_059,
      delta: 190_941,
      from: '2026-05-06',
      to: '2026-05-31',
    },
    {
      label: 'RIDHWAN MUZAKI',
      due: 5_044_000,
      paid: 5_244_000,
      delta: -200_000,
      from: '2026-06-01',
      to: '2026-06-30',
    },
  ],
  months: [
    { ym: '2026-05', due: 10_088_000, paid: 9_897_059, delta: 190_941, balance: 190_941 },
    { ym: '2026-06', due: 5_044_000, paid: 5_244_000, delta: -200_000, balance: -9_059 },
  ],
  total: -9_059,
  contributorCount: 2,
  rangeFrom: '2026-05',
  rangeTo: '2026-06',
};

describe('OutstandingModal (Rincian Outstanding)', () => {
  const renderModal = (props?: Partial<Parameters<typeof OutstandingModal>[0]>) =>
    render(
      <OutstandingModal
        subject="B1075SDW"
        breakdown={breakdown}
        month={6}
        year={2026}
        onClose={vi.fn()}
        {...props}
      />,
    );

  it('restates the balance the cell showed, with the span that formed it', () => {
    renderModal();
    expect(screen.getByText('Rincian Outstanding')).toBeInTheDocument();
    expect(screen.getByText(/B1075SDW · saldo berjalan s\/d Juni 2026/)).toBeInTheDocument();
    // credit balances keep their sign rather than being clamped to zero; the
    // strip, the contributor footer and the closing month all state the same one
    expect(screen.getAllByText('-Rp 9.059')).toHaveLength(3);
    expect(screen.getByText(/Terbentuk dari 2 driver · Mei–Jun 2026/)).toBeInTheDocument();
  });

  it('lists both readings of the same money, and they agree', () => {
    renderModal();
    expect(
      screen.getByRole('heading', { name: 'Penyumbang saldo per driver' }),
    ).toBeInTheDocument();
    expect(screen.getByText('BUDI SANTOSO')).toBeInTheDocument();
    expect(screen.getByText('RIDHWAN MUZAKI')).toBeInTheDocument();
    // the contributor table foots to the same balance the months close on
    const totalRow = screen.getByText('TOTAL').closest('tr')!;
    expect(within(totalRow).getByText('-Rp 9.059')).toBeInTheDocument();

    expect(screen.getByText('Pergerakan per bulan')).toBeInTheDocument();
    expect(screen.getByText('Mei 2026')).toBeInTheDocument();
    expect(screen.getByText('Jun 2026')).toBeInTheDocument();
  });

  it('names the contributor after the grid mode', () => {
    renderModal({ mode: 'driver', subject: 'RIDHWAN MUZAKI' });
    expect(screen.getByText('Penyumbang saldo per plat')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Plat' })).toBeInTheDocument();
  });

  it('spells out that Tidak Masuk Setoran still settles the obligation', () => {
    renderModal();
    expect(screen.getByText(/termasuk yang ditandai Tidak Masuk Setoran/)).toBeInTheDocument();
    expect(screen.getByText(/tidak dihitung sebagai omset/)).toBeInTheDocument();
  });

  it('says so plainly when a row has no history at all', () => {
    renderModal({
      breakdown: {
        parts: [],
        months: [],
        total: 0,
        contributorCount: 0,
        rangeFrom: null,
        rangeTo: null,
      },
    });
    expect(screen.getByText('Belum ada riwayat')).toBeInTheDocument();
  });

  it('closes on Tutup', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });
    await user.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('RawDataPanel (Data Mentah Tanpa Plat)', () => {
  const rows: RawManualRow[] = [
    {
      detailId: 1,
      transactionDate: '2026-08-03',
      driverName: 'MEDI HOLMES LUMBAN TOBING',
      amount: 1_279_599,
      isManualPaymentSetoran: null,
      note: null,
    },
  ];

  it('starts collapsed, keeping only the count and the total in view', () => {
    render(<RawDataPanel rows={rows} totalAmount={1_279_599} onProcess={vi.fn()} />);
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
    expect(screen.getByText('1 entri')).toBeInTheDocument();
    expect(screen.getByText('Rp 1.279.599')).toBeInTheDocument();
    // the queue itself stays out of the way until asked for
    expect(screen.queryByText('MEDI HOLMES LUMBAN TOBING')).toBeNull();
  });

  it('expands on click', async () => {
    const user = userEvent.setup();
    render(<RawDataPanel rows={rows} totalAmount={1_279_599} onProcess={vi.fn()} />);
    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('MEDI HOLMES LUMBAN TOBING')).toBeInTheDocument();
  });
});
