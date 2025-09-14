/**
 * Lightweight replacement for date-fns formatDistanceToNow in Japanese.
 * Uses Intl.RelativeTimeFormat to avoid external dependency.
 */
export function formatDistanceToNowJa(input: Date | number): string {
  const target = new Date(input);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime(); // future: positive, past: negative

  const rtf = new Intl.RelativeTimeFormat('ja', {
    numeric: 'always', // force X単位前/後 instead of 昨日/明日
    style: 'short',
  });

  const absSec = Math.abs(diffMs) / 1000;
  const sign = diffMs < 0 ? -1 : 1;

  // Helper to format with rounding to the nearest unit
  const fmt = (
    value: number,
    unit:
      | 'second'
      | 'minute'
      | 'hour'
      | 'day'
      | 'week'
      | 'month'
      | 'year'
  ) =>
    rtf.format(sign * Math.round(value), unit);

  if (absSec < 60) {
    return fmt(absSec, 'second');
  }

  const absMin = absSec / 60;
  if (absMin < 60) {
    return fmt(absMin, 'minute');
  }

  const absHour = absMin / 60;
  if (absHour < 24) {
    return fmt(absHour, 'hour');
  }

  const absDay = absHour / 24;
  if (absDay < 7) {
    return fmt(absDay, 'day');
  }

  const absWeek = absDay / 7;
  if (absWeek < 4) {
    return fmt(absWeek, 'week');
  }

  const absMonth = absDay / 30; // approximate
  if (absMonth < 12) {
    return fmt(absMonth, 'month');
  }

  const absYear = absDay / 365; // approximate
  return fmt(absYear, 'year');
}
