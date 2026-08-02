import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableFilterBar } from './TableFilterBar';

// The bar owns no filtering of its own: it only patches the URL search params,
// which key the grid query. Everything asserted here is that contract.

const TYPES = ['BYD ATTO 1', 'BYD M6', 'WULING CLOUD'];

function renderBar(overrides?: Partial<Parameters<typeof TableFilterBar>[0]>) {
  const onChange = vi.fn();
  const props = {
    mode: 'plate' as const,
    q: undefined,
    vehicleType: [],
    typeOptions: TYPES,
    onChange,
    ...overrides,
  };
  const view = render(<TableFilterBar {...props} />);
  return { onChange, view };
}

describe('TableFilterBar', () => {
  // The reading mode lives here rather than in the page header: like the two
  // filters it only reshapes the table, so it belongs next to it.
  it('carries the By Plat / By Driver toggle and patches mode', async () => {
    const user = userEvent.setup();
    const { onChange } = renderBar();

    const byDriver = screen.getByRole('radio', { name: 'By Driver' });
    expect(screen.getByRole('radio', { name: 'By Plat' })).toHaveAttribute('aria-checked', 'true');
    await user.click(byDriver);
    expect(onChange).toHaveBeenCalledWith({ mode: 'driver' });
  });

  it('debounces typing into a single q patch', async () => {
    const user = userEvent.setup();
    const { onChange } = renderBar();

    await user.type(screen.getByLabelText('Cari plat atau driver'), 'chandra');
    // still quiet while the reader is typing
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ q: 'chandra' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('trims the query and clears it back to undefined rather than an empty string', async () => {
    const user = userEvent.setup();
    const { onChange } = renderBar({ q: 'budi' });

    await user.click(screen.getByLabelText('Hapus pencarian'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ q: undefined }));
  });

  it('toggles a vehicle type without dropping the other options', async () => {
    const user = userEvent.setup();
    const { onChange } = renderBar();

    await user.click(screen.getByRole('button', { name: /Tipe Kendaraan/ }));
    await user.click(screen.getByText('BYD M6'));
    expect(onChange).toHaveBeenCalledWith({ vehicleType: ['BYD M6'] });
    // the list is server-supplied and unaffected by the selection
    for (const type of TYPES) expect(screen.getByText(type)).toBeInTheDocument();
  });

  it('resets both filters at once', async () => {
    const user = userEvent.setup();
    const { onChange } = renderBar({ q: 'budi', vehicleType: ['BYD M6'] });

    await user.click(screen.getByRole('button', { name: /Bersihkan filter/ }));
    expect(onChange).toHaveBeenCalledWith({ q: undefined, vehicleType: [] });
  });

  it('offers no reset, count or note while nothing is filtered', () => {
    renderBar();
    expect(screen.queryByRole('button', { name: /Bersihkan filter/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/cocok/)).not.toBeInTheDocument();
    expect(screen.queryByText(/kartu ringkasan/i)).not.toBeInTheDocument();
  });

  it('warns that the cards stay whole-fleet only on the surfaces where they do', () => {
    const { view } = renderBar({ q: 'budi', hasUnfilteredAggregates: true });
    expect(screen.getByText(/kartu ringkasan/i)).toBeInTheDocument();

    view.unmount();
    renderBar({ q: 'budi' }); // admin Grab: its cards DO follow the filter
    expect(screen.queryByText(/kartu ringkasan/i)).not.toBeInTheDocument();
  });

  it('reports the match count while a filter is narrowing the table', () => {
    renderBar({ q: 'budi', resultCount: 3, resultNoun: 'kendaraan' });
    expect(screen.getByText('3 kendaraan cocok')).toBeInTheDocument();
  });
});
