import { describe, expect, it } from 'vitest';
import { addDays, formatDisplayDate, todayISO } from './dates';

describe('dates', () => {
  it('formats a calendar day in the requested timezone', () => {
    const instant = new Date('2026-04-02T03:30:00Z');
    expect(todayISO(instant, 'UTC')).toBe('2026-04-02');
    expect(todayISO(instant, 'America/Los_Angeles')).toBe('2026-04-01');
  });

  it('adds days on the calendar, including across a month boundary', () => {
    expect(addDays('2026-03-30', 3)).toBe('2026-04-02');
    expect(addDays('2026-04-02', -1)).toBe('2026-04-01');
  });

  it('prints an ISO date without shifting the day', () => {
    expect(formatDisplayDate('2026-04-02')).toBe('Apr 2, 2026');
  });

  it('falls back to UTC when the timezone name is unknown', () => {
    expect(todayISO(new Date('2026-04-02T12:00:00Z'), 'Not/AZone')).toBe('2026-04-02');
  });
});
