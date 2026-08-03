export function addCalendarMonths(dateString: string, months = 1): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return '';

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const target = new Date(Date.UTC(year, monthIndex + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function addCalendarYears(dateString: string, years = 1): string {
  return addCalendarMonths(dateString, years * 12);
}

export function addCalendarMonthsToDate(value: Date, months = 1): Date {
  const target = new Date(value.getTime());
  const day = target.getUTCDate();
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

export function addBillingCycleToDate(value: Date, billingCycle: unknown): Date {
  switch (String(billingCycle || 'MONTHLY').toUpperCase()) {
    case 'YEARLY':
    case 'ANNUAL':
      return addCalendarMonthsToDate(value, 12);
    case 'LIFETIME':
      // Existing subscription checks require a future end_date.
      return addCalendarMonthsToDate(value, 1200);
    default:
      return addCalendarMonthsToDate(value, 1);
  }
}
