import { describe, expect, it } from 'vitest';
import {
  addBillingCycleToDate,
  addCalendarMonths,
  addCalendarMonthsToDate,
  addCalendarYears,
} from './calendar-date';

describe('calendar billing dates', () => {
  it('advances by named calendar month instead of 30 days', () => {
    expect(addCalendarMonths('2026-07-15')).toBe('2026-08-15');
    expect(addCalendarMonths('2026-08-15')).toBe('2026-09-15');
  });

  it('clamps month-end dates safely', () => {
    expect(addCalendarMonths('2026-01-31')).toBe('2026-02-28');
    expect(addCalendarMonths('2028-01-31')).toBe('2028-02-29');
  });

  it('handles leap-day yearly renewals', () => {
    expect(addCalendarYears('2028-02-29')).toBe('2029-02-28');
  });

  it('preserves the time while clamping Date values at month end', () => {
    const result = addCalendarMonthsToDate(new Date('2026-01-31T14:45:30.000Z'));
    expect(result.toISOString()).toBe('2026-02-28T14:45:30.000Z');
  });

  it('uses each plan billing cycle', () => {
    const start = new Date('2028-02-29T00:00:00.000Z');
    expect(addBillingCycleToDate(start, 'MONTHLY').toISOString()).toBe('2028-03-29T00:00:00.000Z');
    expect(addBillingCycleToDate(start, 'YEARLY').toISOString()).toBe('2029-02-28T00:00:00.000Z');
    expect(addBillingCycleToDate(start, 'LIFETIME').getUTCFullYear()).toBe(2128);
  });
});
