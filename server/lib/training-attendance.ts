export type TrainingAttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'
  | 'injured';

export interface TrainingAttendanceEntry {
  status: TrainingAttendanceStatus;
  sessionDate: string | Date;
}

export type TrainingRecurrenceFrequency = 'daily' | 'weekly';

export interface TrainingRecurrenceRule {
  frequency: TrainingRecurrenceFrequency;
  interval: number;
  weekday?: number | null;
  timezoneOffsetMinutes?: number;
}

export function buildRecurringSessionDates(
  startDate: string | Date,
  rule: TrainingRecurrenceRule,
  occurrenceCount: number,
): Date[] {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    throw new Error('A valid recurrence start date is required');
  }
  if (!['daily', 'weekly'].includes(rule.frequency)) {
    throw new Error('Recurrence frequency must be daily or weekly');
  }
  if (!Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 12) {
    throw new Error('Recurrence interval must be between 1 and 12');
  }
  if (
    rule.weekday != null &&
    (!Number.isInteger(rule.weekday) ||
      rule.weekday < 0 ||
      rule.weekday > 6 ||
      rule.frequency !== 'weekly')
  ) {
    throw new Error('A weekly recurrence day must be between Sunday and Saturday');
  }
  if (!Number.isInteger(occurrenceCount) || occurrenceCount < 2 || occurrenceCount > 52) {
    throw new Error('Recurring sessions must contain between 2 and 52 occurrences');
  }

  const timezoneOffsetMinutes = Number(rule.timezoneOffsetMinutes ?? 0);
  if (
    !Number.isInteger(timezoneOffsetMinutes) ||
    timezoneOffsetMinutes < -840 ||
    timezoneOffsetMinutes > 840
  ) {
    throw new Error('Timezone offset must be between -840 and 840 minutes');
  }

  // Work on a UTC representation of the creator's local wall clock. This keeps
  // "daily" and weekday rules on the selected local calendar day rather than
  // accidentally shifting the weekday for academies outside UTC.
  const localWallClock = new Date(
    start.getTime() - timezoneOffsetMinutes * 60_000,
  );
  if (rule.weekday != null) {
    const daysUntilSelectedWeekday =
      (rule.weekday - localWallClock.getUTCDay() + 7) % 7;
    localWallClock.setUTCDate(
      localWallClock.getUTCDate() + daysUntilSelectedWeekday,
    );
  }

  const dayInterval =
    rule.frequency === 'daily' ? rule.interval : rule.interval * 7;

  return Array.from({ length: occurrenceCount }, (_, index) => {
    const occurrence = new Date(localWallClock);
    occurrence.setUTCDate(
      localWallClock.getUTCDate() + index * dayInterval,
    );
    return new Date(
      occurrence.getTime() + timezoneOffsetMinutes * 60_000,
    );
  });
}

const attendedStatuses = new Set<TrainingAttendanceStatus>(['present', 'late']);
const neutralStatuses = new Set<TrainingAttendanceStatus>(['excused', 'injured']);
const streakMilestones = [3, 5, 10, 20, 30, 50, 75, 100];

export function calculateAttendanceGamification(entries: TrainingAttendanceEntry[]) {
  const newestFirst = [...entries].sort(
    (left, right) =>
      new Date(right.sessionDate).getTime() - new Date(left.sessionDate).getTime(),
  );
  const oldestFirst = [...newestFirst].reverse();

  const attendedSessions = newestFirst.filter((entry) =>
    attendedStatuses.has(entry.status),
  ).length;
  const presentSessions = newestFirst.filter((entry) => entry.status === 'present').length;
  const lateSessions = newestFirst.filter((entry) => entry.status === 'late').length;
  const absentSessions = newestFirst.filter((entry) => entry.status === 'absent').length;
  const rateEligibleSessions = attendedSessions + absentSessions;

  let currentStreak = 0;
  for (const entry of newestFirst) {
    if (attendedStatuses.has(entry.status)) {
      currentStreak += 1;
      continue;
    }
    if (neutralStatuses.has(entry.status)) continue;
    break;
  }

  let runningStreak = 0;
  let longestStreak = 0;
  for (const entry of oldestFirst) {
    if (attendedStatuses.has(entry.status)) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else if (!neutralStatuses.has(entry.status)) {
      runningStreak = 0;
    }
  }

  const nextMilestone =
    streakMilestones.find((milestone) => milestone > currentStreak) ??
    currentStreak + 25;
  const previousMilestone =
    [...streakMilestones].reverse().find((milestone) => milestone <= currentStreak) ?? 0;
  const milestoneSpan = Math.max(1, nextMilestone - previousMilestone);
  const milestoneProgress = Math.min(
    100,
    Math.round(((currentStreak - previousMilestone) / milestoneSpan) * 100),
  );

  const points = presentSessions * 10 + lateSessions * 7 + longestStreak * 2;
  const badge =
    longestStreak >= 20
      ? 'Iron Player'
      : longestStreak >= 10
        ? 'Unstoppable'
        : longestStreak >= 5
          ? 'On Fire'
          : longestStreak >= 3
            ? 'Rising Star'
            : 'First Step';

  const latestEntry = newestFirst[0] ?? null;

  return {
    totalRecordedSessions: newestFirst.length,
    attendedSessions,
    presentSessions,
    lateSessions,
    absentSessions,
    attendanceRate:
      rateEligibleSessions > 0
        ? Math.round((attendedSessions / rateEligibleSessions) * 100)
        : 0,
    currentStreak,
    longestStreak,
    points,
    badge,
    nextMilestone,
    milestoneProgress,
    attendedRecentSession: Boolean(
      latestEntry && attendedStatuses.has(latestEntry.status),
    ),
    latestStatus: latestEntry?.status ?? null,
  };
}
