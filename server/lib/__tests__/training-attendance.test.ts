import { describe, expect, it } from 'vitest';
import {
  buildRecurringSessionDates,
  calculateAttendanceGamification,
} from '../training-attendance';

describe('buildRecurringSessionDates', () => {
  it('builds the requested number of weekly session dates', () => {
    const dates = buildRecurringSessionDates(
      '2026-07-28T16:00:00Z',
      { frequency: 'weekly', interval: 1 },
      4,
    );

    expect(dates.map((date) => date.toISOString())).toEqual([
      '2026-07-28T16:00:00.000Z',
      '2026-08-04T16:00:00.000Z',
      '2026-08-11T16:00:00.000Z',
      '2026-08-18T16:00:00.000Z',
    ]);
  });

  it('builds daily sessions on consecutive calendar days', () => {
    const dates = buildRecurringSessionDates(
      '2026-07-28T16:00:00Z',
      { frequency: 'daily', interval: 1 },
      4,
    );

    expect(dates.map((date) => date.toISOString())).toEqual([
      '2026-07-28T16:00:00.000Z',
      '2026-07-29T16:00:00.000Z',
      '2026-07-30T16:00:00.000Z',
      '2026-07-31T16:00:00.000Z',
    ]);
  });

  it('moves the first occurrence to the selected local weekday', () => {
    const dates = buildRecurringSessionDates(
      '2026-07-28T20:00:00Z',
      {
        frequency: 'weekly',
        interval: 1,
        weekday: 1,
        timezoneOffsetMinutes: -120,
      },
      2,
    );

    expect(dates.map((date) => date.toISOString())).toEqual([
      '2026-08-03T20:00:00.000Z',
      '2026-08-10T20:00:00.000Z',
    ]);
  });

  it('rejects recurrence rules outside the supported limits', () => {
    expect(() =>
      buildRecurringSessionDates(
        '2026-07-28T16:00:00Z',
        { frequency: 'weekly', interval: 0 },
        4,
      ),
    ).toThrow('between 1 and 12');
    expect(() =>
      buildRecurringSessionDates(
        '2026-07-28T16:00:00Z',
        { frequency: 'weekly', interval: 1 },
        53,
      ),
    ).toThrow('between 2 and 52 occurrences');
  });
});

describe('calculateAttendanceGamification', () => {
  it('calculates current and longest attendance streaks', () => {
    const summary = calculateAttendanceGamification([
      { status: 'present', sessionDate: '2026-07-28T15:00:00Z' },
      { status: 'late', sessionDate: '2026-07-26T15:00:00Z' },
      { status: 'excused', sessionDate: '2026-07-24T15:00:00Z' },
      { status: 'present', sessionDate: '2026-07-22T15:00:00Z' },
      { status: 'absent', sessionDate: '2026-07-20T15:00:00Z' },
      { status: 'present', sessionDate: '2026-07-18T15:00:00Z' },
    ]);

    expect(summary.currentStreak).toBe(3);
    expect(summary.longestStreak).toBe(3);
    expect(summary.attendanceRate).toBe(80);
    expect(summary.attendedRecentSession).toBe(true);
    expect(summary.badge).toBe('Rising Star');
  });

  it('breaks the current streak after an absence', () => {
    const summary = calculateAttendanceGamification([
      { status: 'absent', sessionDate: '2026-07-28T15:00:00Z' },
      { status: 'present', sessionDate: '2026-07-26T15:00:00Z' },
      { status: 'present', sessionDate: '2026-07-24T15:00:00Z' },
    ]);

    expect(summary.currentStreak).toBe(0);
    expect(summary.longestStreak).toBe(2);
    expect(summary.attendedRecentSession).toBe(false);
  });
});
