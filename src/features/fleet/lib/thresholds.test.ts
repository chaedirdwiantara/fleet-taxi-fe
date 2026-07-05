import { describe, it, expect } from 'vitest';
import { cellTone, toneClass, toneClickable, type CellTone, type DayFacts } from './thresholds';

const TARGET = 488_000;
const facts = (f: Partial<DayFacts>): DayFacts => ({ displayAmount: 0, countedAmount: 0, ...f });

// Exhaustive port checks of the legacy _table.blade.php cell-class logic.
describe('cellTone (legacy 8-state, priority order)', () => {
  it('no data → empty', () => {
    expect(cellTone(undefined, TARGET)).toBe('empty');
  });

  it('counted >= target → target (green)', () => {
    expect(cellTone(facts({ displayAmount: TARGET, countedAmount: TARGET }), TARGET)).toBe('target');
    expect(cellTone(facts({ displayAmount: TARGET * 2, countedAmount: TARGET * 2 }), TARGET)).toBe('target');
  });

  it('counted < target → below (yellow)', () => {
    expect(cellTone(facts({ displayAmount: TARGET - 1, countedAmount: TARGET - 1 }), TARGET)).toBe('below');
  });

  it('present but Rp0 → zero (red)', () => {
    expect(cellTone(facts({ displayAmount: 0, countedAmount: 0 }), TARGET)).toBe('zero');
  });

  it('manual payment → manual (purple)', () => {
    expect(cellTone(facts({ displayAmount: 200_000, countedAmount: 200_000, isManualPayment: true }), TARGET)).toBe('manual');
  });

  it('display-only manual with no counted → manual (purple)', () => {
    expect(cellTone(facts({ displayAmount: 200_000, countedAmount: 0, hasDisplayOnlyManualPayment: true }), TARGET)).toBe('manual');
  });

  it('mixed (deduction + manual) → mixed (orange), wins over manual', () => {
    expect(cellTone(facts({ displayAmount: 600_000, countedAmount: 600_000, isMixed: true, isManualPayment: true }), TARGET)).toBe('mixed');
  });

  it('exception, no money → bebas (blue) / nonop (gray)', () => {
    expect(cellTone(facts({ exception: { isBebasSetoran: true, keterangan: 'RENTAL' } }), TARGET)).toBe('bebas');
    expect(cellTone(facts({ exception: { isBebasSetoran: false, keterangan: 'PERBAIKAN' } }), TARGET)).toBe('nonop');
  });

  it('spreadsheet money WINS over an exception marker (brief §2.A)', () => {
    // exception present but there IS money → tone from the money, not the exception
    expect(cellTone(facts({ displayAmount: TARGET, countedAmount: TARGET, exception: { isBebasSetoran: true, keterangan: 'RENTAL' } }), TARGET)).toBe('target');
  });
});

describe('toneClass / toneClickable', () => {
  it('every tone maps to a distinct non-empty class', () => {
    const tones: CellTone[] = ['empty', 'zero', 'below', 'target', 'manual', 'mixed', 'bebas', 'nonop'];
    tones.forEach((t) => expect(toneClass(t)).toBeTruthy());
    expect(new Set(tones.map(toneClass)).size).toBe(tones.length);
  });

  it('only value/manual/mixed cells are clickable (open breakdown)', () => {
    expect(toneClickable('target')).toBe(true);
    expect(toneClickable('below')).toBe(true);
    expect(toneClickable('manual')).toBe(true);
    expect(toneClickable('mixed')).toBe(true);
    expect(toneClickable('empty')).toBe(false);
    expect(toneClickable('zero')).toBe(false);
    expect(toneClickable('bebas')).toBe(false);
    expect(toneClickable('nonop')).toBe(false);
  });
});
