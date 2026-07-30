import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangePicker } from './DateRangePicker';
import { todayWIB } from '@/lib/datetime';

// A month with a known shape: July 2026 starts on a Wednesday and has 31 days.
const PERIOD = { month: 7, year: 2026 };

function setup(props: Partial<React.ComponentProps<typeof DateRangePicker>> = {}) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<DateRangePicker onChange={onChange} {...PERIOD} {...props} />);
  return { onChange, user };
}

const openCalendar = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /Rentang tanggal/ }));

describe('DateRangePicker', () => {
  it('reads "Semua Tanggal" until a range is picked', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Rentang tanggal' })).toHaveTextContent(
      'Semua Tanggal',
    );
  });

  it('picks a range in two clicks', async () => {
    const { onChange, user } = setup();
    await openCalendar(user);

    await user.click(screen.getByRole('button', { name: '5 Jul 2026' }));
    expect(onChange).not.toHaveBeenCalled(); // still waiting for the closing date
    await user.click(screen.getByRole('button', { name: '12 Jul 2026' }));

    expect(onChange).toHaveBeenCalledWith({ dateFrom: '2026-07-05', dateTo: '2026-07-12' });
  });

  it('orders the range no matter which end is clicked first', async () => {
    const { onChange, user } = setup();
    await openCalendar(user);

    await user.click(screen.getByRole('button', { name: '20 Jul 2026' }));
    await user.click(screen.getByRole('button', { name: '3 Jul 2026' }));

    expect(onChange).toHaveBeenCalledWith({ dateFrom: '2026-07-03', dateTo: '2026-07-20' });
  });

  it('crosses the month boundary in one gesture', async () => {
    const { onChange, user } = setup();
    await openCalendar(user);

    // The second pane shows August, so 25 Jul → 5 Aug needs no navigation.
    await user.click(screen.getByRole('button', { name: '25 Jul 2026' }));
    await user.click(screen.getByRole('button', { name: '5 Agu 2026' }));

    expect(onChange).toHaveBeenCalledWith({ dateFrom: '2026-07-25', dateTo: '2026-08-05' });
  });

  it('refuses a span the API would reject', async () => {
    const { user } = setup({ maxDays: 7 });
    await openCalendar(user);

    await user.click(screen.getByRole('button', { name: '1 Jul 2026' }));
    // day 7 is the last one still inside a 7-day span
    expect(screen.getByRole('button', { name: '7 Jul 2026' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '8 Jul 2026' })).toBeDisabled();
  });

  it('applies the "Hari ini" preset', async () => {
    const { onChange, user } = setup();
    await openCalendar(user);
    await user.click(screen.getByRole('button', { name: 'Hari ini' }));

    const today = todayWIB();
    expect(onChange).toHaveBeenCalledWith({ dateFrom: today, dateTo: today });
  });

  it('shows the active range on the trigger and clears it', async () => {
    const { onChange, user } = setup({ value: { dateFrom: '2026-07-25', dateTo: '2026-08-05' } });
    expect(screen.getByRole('button', { name: /Rentang tanggal/ })).toHaveTextContent(
      '25 Jul – 5 Agu 2026',
    );

    await openCalendar(user);
    await user.click(screen.getByRole('button', { name: 'Semua Tanggal' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('navigates months with the arrows', async () => {
    const { user } = setup();
    await openCalendar(user);
    expect(screen.queryByRole('button', { name: '15 Jun 2026' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Bulan sebelumnya' }));
    expect(screen.getByRole('button', { name: '15 Jun 2026' })).toBeInTheDocument();
  });
});
