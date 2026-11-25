import { describe, expect, it } from 'vitest';
import {
  canTransition,
  planReminderSweep,
  statusAfterSweep,
  type SweepInvoice,
} from './invoice-status';

const today = '2026-04-02';

function invoice(overrides: Partial<SweepInvoice> = {}): SweepInvoice {
  return {
    id: 'inv-1',
    status: 'sent',
    dueDate: '2026-04-01',
    lastReminderOn: null,
    reminderCount: 0,
    ...overrides,
  };
}

describe('canTransition', () => {
  it('allows the desk to send a draft and record payment later', () => {
    expect(canTransition('draft', 'sent')).toBe(true);
    expect(canTransition('sent', 'paid')).toBe(true);
    expect(canTransition('overdue', 'paid')).toBe(true);
  });

  it('keeps paid invoices closed and refuses skipping ahead', () => {
    expect(canTransition('paid', 'draft')).toBe(false);
    expect(canTransition('paid', 'sent')).toBe(false);
    expect(canTransition('draft', 'paid')).toBe(false);
    expect(canTransition('draft', 'overdue')).toBe(false);
    expect(canTransition('overdue', 'sent')).toBe(false);
  });
});

describe('statusAfterSweep', () => {
  it('marks a sent invoice overdue only after the due date', () => {
    expect(statusAfterSweep('sent', '2026-04-01', today)).toBe('overdue');
    expect(statusAfterSweep('sent', '2026-04-02', today)).toBe('sent');
    expect(statusAfterSweep('sent', '2026-04-03', today)).toBe('sent');
  });

  it('does not reopen drafts or paid invoices', () => {
    expect(statusAfterSweep('draft', '2026-04-01', today)).toBe('draft');
    expect(statusAfterSweep('paid', '2026-04-01', today)).toBe('paid');
    expect(statusAfterSweep('overdue', '2026-04-10', today)).toBe('overdue');
  });
});

describe('planReminderSweep', () => {
  it('moves a past-due sent invoice to overdue and sends the first reminder', () => {
    expect(planReminderSweep([invoice()], today)).toEqual([
      { id: 'inv-1', status: 'overdue', sendReminder: true },
    ]);
  });

  it('waits out the cooldown before emailing again', () => {
    const rows = [
      invoice({
        status: 'overdue',
        lastReminderOn: '2026-04-02',
        reminderCount: 1,
      }),
    ];
    expect(planReminderSweep(rows, today)).toEqual([]);
  });

  it('sends again once the cooldown has elapsed and the cap allows it', () => {
    const rows = [
      invoice({
        id: 'inv-2',
        status: 'overdue',
        dueDate: '2026-03-20',
        lastReminderOn: '2026-03-30',
        reminderCount: 1,
      }),
    ];
    expect(planReminderSweep(rows, today, { cooldownDays: 3, maxReminders: 4 })).toEqual([
      { id: 'inv-2', status: 'overdue', sendReminder: true },
    ]);
  });

  it('still marks a sent invoice overdue after the reminder cap is reached', () => {
    const rows = [invoice({ reminderCount: 4, lastReminderOn: '2026-03-01' })];
    expect(planReminderSweep(rows, today, { cooldownDays: 3, maxReminders: 4 })).toEqual([
      { id: 'inv-1', status: 'overdue', sendReminder: false },
    ]);
  });

  it('leaves drafts, paid invoices, and invoices that are not yet due alone', () => {
    const rows = [
      invoice({ id: 'draft', status: 'draft' }),
      invoice({ id: 'paid', status: 'paid' }),
      invoice({ id: 'future', dueDate: '2026-04-09' }),
    ];
    expect(planReminderSweep(rows, today)).toEqual([]);
  });
});
