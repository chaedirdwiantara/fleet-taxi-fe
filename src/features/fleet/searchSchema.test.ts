import { describe, it, expect } from 'vitest';
import { fleetSearchSchema, parseCellParam, makeCellParam } from './searchSchema';
import { currentMonthWIB, currentYearWIB } from '@/lib/datetime';

describe('fleetSearchSchema (URL ⇄ query key, kickoff §4)', () => {
  it('accepts valid params', () => {
    expect(
      fleetSearchSchema.parse({
        month: 7,
        year: 2026,
        rentalPartner: ['BHISA'],
        plate: 'B1234',
        cell: 'B1234XYZ:14',
        mode: 'driver',
      }),
    ).toEqual({
      month: 7,
      year: 2026,
      rentalPartner: ['BHISA'],
      plate: 'B1234',
      cell: 'B1234XYZ:14',
      mode: 'driver',
    });
  });

  it('reads the pivot mode from the URL and falls back to plate', () => {
    expect(fleetSearchSchema.parse({ mode: 'driver' }).mode).toBe('driver');
    expect(fleetSearchSchema.parse({ mode: 'nonsense' }).mode).toBe('plate');
    expect(fleetSearchSchema.parse({}).mode).toBe('plate');
  });

  it('falls back to the current WIB period on garbage', () => {
    const parsed = fleetSearchSchema.parse({ month: 99, year: 'abc', rentalPartner: 'x' });
    expect(parsed.month).toBe(currentMonthWIB());
    expect(parsed.year).toBe(currentYearWIB());
    expect(parsed.rentalPartner).toEqual([]);
  });

  it('defaults everything when params are absent', () => {
    const parsed = fleetSearchSchema.parse({});
    expect(parsed.month).toBeGreaterThanOrEqual(1);
    expect(parsed.month).toBeLessThanOrEqual(12);
    expect(parsed.plate).toBeUndefined();
    expect(parsed.cell).toBeUndefined();
  });
});

describe('cell param (deep-linkable modal)', () => {
  it('round-trips plate:day', () => {
    expect(parseCellParam(makeCellParam('B1234XYZ', 14))).toEqual({ key: 'B1234XYZ', day: 14 });
  });

  it('supports composite Grab keys containing pipes/colons safely', () => {
    const key = 'B2000GRB|Jakarta|Budi Santoso';
    expect(parseCellParam(makeCellParam(key, 3))).toEqual({ key, day: 3 });
  });

  it('rejects malformed values', () => {
    expect(parseCellParam(undefined)).toBeNull();
    expect(parseCellParam('nocolon')).toBeNull();
    expect(parseCellParam('plate:0')).toBeNull();
    expect(parseCellParam('plate:99')).toBeNull();
    expect(parseCellParam(':5')).toBeNull();
  });
});
