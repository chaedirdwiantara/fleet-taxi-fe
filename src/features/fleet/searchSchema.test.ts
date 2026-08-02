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
        q: 'B1234',
        vehicleType: ['BYD M6'],
        cell: 'B1234XYZ:14',
        mode: 'driver',
      }),
    ).toEqual({
      month: 7,
      year: 2026,
      rentalPartner: ['BHISA'],
      q: 'B1234',
      vehicleType: ['BYD M6'],
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
    expect(parsed.q).toBeUndefined();
    expect(parsed.vehicleType).toEqual([]);
    expect(parsed.cell).toBeUndefined();
  });

  it('keeps the table filters: q as free text, vehicleType as a list', () => {
    const parsed = fleetSearchSchema.parse({ q: 'chandra', vehicleType: ['BYD M6', 'BYD ATTO 1'] });
    expect(parsed.q).toBe('chandra');
    expect(parsed.vehicleType).toEqual(['BYD M6', 'BYD ATTO 1']);
    // a hand-edited URL that sends the wrong shape falls back, never throws
    expect(fleetSearchSchema.parse({ vehicleType: 'BYD M6' }).vehicleType).toEqual([]);
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
