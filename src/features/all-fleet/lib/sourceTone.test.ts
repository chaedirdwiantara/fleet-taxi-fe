import { describe, expect, it } from 'vitest';
import {
  activeSources,
  cellTone,
  gojekStatus,
  gojekStatusLabel,
  isClickable,
  numberToneClass,
  toneClass,
} from './sourceTone';
import type { AllFleetDayCell, AllFleetGojekDay } from '../types';

const cell = (overrides: Partial<AllFleetDayCell> = {}): AllFleetDayCell => ({
  gojek: 0,
  grab: 0,
  rental: 0,
  total: 0,
  isZero: false,
  ...overrides,
});

const gojekDay = (overrides: Partial<AllFleetGojekDay> = {}): AllFleetGojekDay => ({
  displayAmount: 400_000,
  countedAmount: 400_000,
  dailyTarget: 388_000,
  exception: null,
  ...overrides,
});

describe('activeSources', () => {
  it('lists only sources carrying money, in display order', () => {
    expect(activeSources(cell({ rental: 500, gojek: 300, total: 800 }))).toEqual([
      'gojek',
      'rental',
    ]);
  });

  it('is empty for a missing cell or an all-zero one', () => {
    expect(activeSources(undefined)).toEqual([]);
    expect(activeSources(cell({ isZero: true }))).toEqual([]);
  });
});

describe('cellTone', () => {
  it('tags a single-source day with that source', () => {
    expect(cellTone(cell({ grab: 400_000, total: 400_000 }))).toEqual({
      kind: 'single',
      source: 'grab',
    });
  });

  it('tags a multi-source day as mixed', () => {
    expect(cellTone(cell({ gojek: 1, grab: 1, total: 2 }))).toEqual({ kind: 'mixed' });
  });

  it('separates "in the data but Rp 0" from "no data"', () => {
    expect(cellTone(cell({ isZero: true }))).toEqual({ kind: 'zero' });
    expect(cellTone(undefined)).toEqual({ kind: 'empty' });
  });

  it('lets money win over the zero flag', () => {
    expect(cellTone(cell({ gojek: 100, total: 100, isZero: true }))).toEqual({
      kind: 'single',
      source: 'gojek',
    });
  });
});

describe('toneClass — the background says WHICH SOURCE', () => {
  it('keeps each source on its own hue, in both themes', () => {
    expect(toneClass({ kind: 'single', source: 'gojek' })).toContain('bg-green-500');
    expect(toneClass({ kind: 'single', source: 'grab' })).toContain('bg-orange-500');
    expect(toneClass({ kind: 'single', source: 'rental' })).toContain('bg-blue-500');
    expect(toneClass({ kind: 'mixed' })).toContain('bg-slate-500');
    expect(toneClass({ kind: 'zero' })).toContain('bg-pink-500');
    expect(toneClass({ kind: 'empty' })).toContain('dark:bg-slate-900');
  });

  it('is a wash, not a solid fill — a coloured figure has to stay legible on it', () => {
    for (const source of ['gojek', 'grab', 'rental'] as const) {
      expect(toneClass({ kind: 'single', source })).toMatch(/\/\d+/);
    }
  });

  it('keeps Gabungan achromatic — every coloured neighbour has a hue to clash with', () => {
    const mixed = toneClass({ kind: 'mixed' });
    // Teal used to sit right next to Gojek green here and the two were near
    // indistinguishable as washes; grey is the one tone with no hue to confuse.
    for (const hue of ['green', 'orange', 'blue', 'pink', 'teal', 'violet', 'fuchsia']) {
      expect(mixed).not.toContain(`-${hue}-`);
    }
    expect(mixed).toMatch(/slate|gray|zinc|neutral|stone/);
  });

  it('does not let Gabungan read as an empty cell', () => {
    expect(toneClass({ kind: 'mixed' })).not.toBe(toneClass({ kind: 'empty' }));
  });
});

describe('numberToneClass — the figure says WHAT STATUS', () => {
  it('wears the Gojek verdict when Gojek reported on the day', () => {
    expect(numberToneClass(cell({ gojek: 400_000, total: 400_000, gojekDay: gojekDay() }))).toBe(
      'text-green-700 dark:text-green-300',
    );
    expect(
      numberToneClass(
        cell({
          gojek: 200_000,
          total: 200_000,
          gojekDay: gojekDay({ displayAmount: 200_000, countedAmount: 200_000 }),
        }),
      ),
    ).toBe('text-amber-700 dark:text-amber-300');
  });

  it('falls back to the source colour where there is no target to judge', () => {
    expect(numberToneClass(cell({ grab: 400_000, total: 400_000 }))).toBe(
      'text-orange-700 dark:text-orange-400',
    );
    expect(numberToneClass(cell({ rental: 400_000, total: 400_000 }))).toBe(
      'text-blue-700 dark:text-blue-400',
    );
  });

  it('reads a mixed-source day through Gojek, since only Gojek carries a target', () => {
    const mixed = cell({
      gojek: 200_000,
      grab: 100_000,
      total: 300_000,
      gojekDay: gojekDay({ displayAmount: 200_000, countedAmount: 200_000 }),
    });
    expect(toneClass(cellTone(mixed))).toContain('bg-slate-500');
    expect(numberToneClass(mixed)).toBe('text-amber-700 dark:text-amber-300');
  });

  it('leaves a purely Rental figure alone on a day Gojek merely flagged', () => {
    // The car did not operate on Gojek because it was out on rental: the money
    // on screen is rental omset, so Gojek's "tidak beroperasi" must not colour
    // it. The flag stays available in the tooltip.
    const rentedOut = cell({
      rental: 1_000_000,
      total: 1_000_000,
      gojekDay: gojekDay({
        displayAmount: 0,
        countedAmount: 0,
        exception: { isBebasSetoran: false, keterangan: 'DISEWA' },
      }),
    });
    expect(numberToneClass(rentedOut)).toBe('text-blue-700 dark:text-blue-400');
    expect(gojekStatusLabel(rentedOut)).toBe('Tidak Beroperasi');
  });

  it('still judges a moneyless Gojek day — there is no other earner to defer to', () => {
    const bebas = cell({
      gojekDay: gojekDay({
        displayAmount: 0,
        countedAmount: 0,
        exception: { isBebasSetoran: true, keterangan: 'RENTAL' },
      }),
    });
    expect(numberToneClass(bebas)).toBe('text-blue-700 dark:text-blue-300');
  });
});

describe('gojekStatus', () => {
  it('reproduces the Gojek grid verdicts exactly', () => {
    expect(gojekStatus(cell({ gojekDay: gojekDay() }))).toBe('target');
    expect(gojekStatus(cell({ gojekDay: gojekDay({ countedAmount: 100_000 }) }))).toBe('below');
    expect(gojekStatus(cell({ gojekDay: gojekDay({ displayAmount: 0, countedAmount: 0 }) }))).toBe(
      'zero',
    );
    expect(
      gojekStatus(
        cell({ gojekDay: gojekDay({ countedAmount: 0, hasDisplayOnlyManualPayment: true }) }),
      ),
    ).toBe('manual');
    expect(
      gojekStatus(
        cell({
          gojekDay: gojekDay({
            displayAmount: 0,
            countedAmount: 0,
            exception: { isBebasSetoran: true, keterangan: 'RENTAL' },
          }),
        }),
      ),
    ).toBe('bebas');
  });

  it('says nothing about a Grab- or Rental-only day', () => {
    expect(gojekStatus(cell({ grab: 1, total: 1 }))).toBeNull();
    expect(gojekStatusLabel(cell({ grab: 1, total: 1 }))).toBeNull();
  });

  it('names the verdict for the tooltip', () => {
    expect(gojekStatusLabel(cell({ gojekDay: gojekDay({ countedAmount: 1 }) }))).toBe(
      'Kurang dari target',
    );
  });
});

describe('cellTone — moneyless Gojek days keep their identity', () => {
  it('claims a bebas-setoran day for Gojek instead of calling it empty', () => {
    const bebas = cell({
      gojekDay: gojekDay({
        displayAmount: 0,
        countedAmount: 0,
        exception: { isBebasSetoran: true, keterangan: 'RENTAL' },
      }),
    });
    expect(cellTone(bebas)).toEqual({ kind: 'single', source: 'gojek' });
  });
});

describe('isClickable', () => {
  it('opens on any day with data — including a Rp 0 one', () => {
    expect(isClickable(cell({ gojek: 1, total: 1 }))).toBe(true);
    expect(isClickable(cell({ isZero: true }))).toBe(true);
  });

  it('opens a moneyless day Gojek had something to say about', () => {
    expect(isClickable(cell({ gojekDay: gojekDay({ displayAmount: 0, countedAmount: 0 }) }))).toBe(
      true,
    );
  });

  it('stays inert on a day with no data', () => {
    expect(isClickable(undefined)).toBe(false);
    expect(isClickable(cell())).toBe(false);
  });
});
