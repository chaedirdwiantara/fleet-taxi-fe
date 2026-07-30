import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  daysInRangeISO,
  diffDaysISO,
  firstWeekdayOffset,
  formatDateRangeID,
  formatDateShortID,
  formatDayMonthID,
  monthEndISO,
  monthStartISO,
  todayWIB,
} from './index';

describe('business-date arithmetic', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDaysISO('2026-07-30', 3)).toBe('2026-08-02');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('measures spans, inclusive and exclusive', () => {
    expect(diffDaysISO('2026-07-01', '2026-07-01')).toBe(0);
    expect(daysInRangeISO('2026-07-01', '2026-07-01')).toBe(1);
    expect(daysInRangeISO('2026-07-25', '2026-08-05')).toBe(12);
    expect(diffDaysISO('2026-07-10', '2026-07-01')).toBe(-9);
  });

  it('bounds a month', () => {
    expect(monthStartISO(2, 2026)).toBe('2026-02-01');
    expect(monthEndISO(2, 2026)).toBe('2026-02-28');
    expect(monthEndISO(2, 2028)).toBe('2028-02-29');
    expect(monthEndISO(7, 2026)).toBe('2026-07-31');
  });

  it('offsets the calendar grid Monday-first', () => {
    // 1 July 2026 is a Wednesday -> two blank cells (Sen, Sel)
    expect(firstWeekdayOffset(7, 2026)).toBe(2);
    // 1 June 2026 is a Monday -> no blanks
    expect(firstWeekdayOffset(6, 2026)).toBe(0);
  });

  it('reads today in WIB, not in the host timezone', () => {
    // 2026-07-30T18:30Z is already 31 July in Jakarta (UTC+7)
    expect(todayWIB(new Date('2026-07-30T18:30:00Z'))).toBe('2026-07-31');
    expect(todayWIB(new Date('2026-07-30T10:00:00Z'))).toBe('2026-07-30');
  });
});

describe('date labels (id-ID)', () => {
  it('formats one date', () => {
    expect(formatDateShortID('2026-07-15')).toBe('15 Jul 2026');
  });

  it('drops what both ends of a range share', () => {
    expect(formatDateRangeID('2026-07-15', '2026-07-15')).toBe('15 Jul 2026');
    expect(formatDateRangeID('2026-07-01', '2026-07-15')).toBe('1 – 15 Jul 2026');
    expect(formatDateRangeID('2026-07-25', '2026-08-05')).toBe('25 Jul – 5 Agu 2026');
    expect(formatDateRangeID('2026-12-28', '2027-01-03')).toBe('28 Des 2026 – 3 Jan 2027');
  });

  it('formats a compact chart tick', () => {
    expect(formatDayMonthID('2026-07-05')).toBe('5/7');
  });
});
