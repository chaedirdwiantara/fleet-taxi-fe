import { describe, expect, it } from 'vitest';
import { activeSources, cellTone, isClickable, toneClass } from './sourceTone';
import type { AllFleetDayCell } from '../types';

const cell = (overrides: Partial<AllFleetDayCell> = {}): AllFleetDayCell => ({
  gojek: 0,
  grab: 0,
  rental: 0,
  total: 0,
  isZero: false,
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

describe('toneClass', () => {
  it('keeps the spreadsheet colors in both themes, like the Gojek grid', () => {
    expect(toneClass({ kind: 'single', source: 'gojek' })).toContain('bg-green-500');
    expect(toneClass({ kind: 'mixed' })).toContain('bg-teal-500');
    // filled tones carry their own contrast, so they need no dark override…
    expect(toneClass({ kind: 'zero' })).toBe('bg-pink-200 text-slate-900');
    // …while the surface-colored "no data" cell follows the theme
    expect(toneClass({ kind: 'empty' })).toContain('dark:bg-slate-900');
  });
});

describe('isClickable', () => {
  it('opens on any day with data — including a Rp 0 one', () => {
    expect(isClickable(cell({ gojek: 1, total: 1 }))).toBe(true);
    expect(isClickable(cell({ isZero: true }))).toBe(true);
  });

  it('stays inert on a day with no data', () => {
    expect(isClickable(undefined)).toBe(false);
    expect(isClickable(cell())).toBe(false);
  });
});
