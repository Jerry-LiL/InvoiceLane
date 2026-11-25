import { and, eq, inArray, lt } from 'drizzle-orm';
import { getDb } from '@/db';
import { invoices } from '@/db/schema';
import { appTimeZone, todayISO } from '@/lib/dates';
import {
  DEFAULT_REMINDER_POLICY,
  planReminderSweep,
  type ReminderPolicy,
} from '@/lib/invoice-status';
import { sendPaymentReminder } from '@/server/deliver';
import { loadInvoiceGraph } from '@/server/invoices';

export type SweepResult = {
  scanned: number;
  markedOverdue: number;
  remindersSent: number;
  failures: { invoiceId: string; message: string }[];
};

function policyFromEnv(): ReminderPolicy {
  const cooldown = Number(process.env.REMINDER_COOLDOWN_DAYS ?? DEFAULT_REMINDER_POLICY.cooldownDays);
  const maxReminders = Number(process.env.REMINDER_MAX_COUNT ?? DEFAULT_REMINDER_POLICY.maxReminders);
  return {
    cooldownDays: Number.isInteger(cooldown) && cooldown >= 0 ? cooldown : DEFAULT_REMINDER_POLICY.cooldownDays,
    maxReminders:
      Number.isInteger(maxReminders) && maxReminders >= 0 ? maxReminders : DEFAULT_REMINDER_POLICY.maxReminders,
  };
}

export async function runReminderSweep(now = new Date()): Promise<SweepResult> {
  const db = getDb();
  const timeZone = appTimeZone();
  const today = todayISO(now, timeZone);
  const rows = await db
    .select({
      id: invoices.id,
      status: invoices.status,
      dueDate: invoices.dueDate,
      lastReminderAt: invoices.lastReminderAt,
      reminderCount: invoices.reminderCount,
    })
    .from(invoices)
    .where(and(inArray(invoices.status, ['sent', 'overdue']), lt(invoices.dueDate, today)));

  const planned = planReminderSweep(
    rows.map((row) => ({
      id: row.id,
      status: row.status,
      dueDate: row.dueDate,
      lastReminderOn: row.lastReminderAt ? todayISO(row.lastReminderAt, timeZone) : null,
      reminderCount: row.reminderCount,
    })),
    today,
    policyFromEnv(),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  const result: SweepResult = {
    scanned: rows.length,
    markedOverdue: 0,
    remindersSent: 0,
    failures: [],
  };

  for (const decision of planned) {
    const row = byId.get(decision.id);
    if (!row) continue;

    if (!decision.sendReminder) {
      if (decision.status === row.status) continue;
      const [updated] = await db
        .update(invoices)
        .set({ status: decision.status, updatedAt: now })
        .where(and(eq(invoices.id, row.id), eq(invoices.status, row.status)))
        .returning({ id: invoices.id });
      if (updated) result.markedOverdue += 1;
      continue;
    }

    const [claimed] = await db
      .update(invoices)
      .set({
        status: decision.status,
        reminderCount: row.reminderCount + 1,
        lastReminderAt: now,
        updatedAt: now,
      })
      .where(
        and(eq(invoices.id, row.id), eq(invoices.status, row.status), eq(invoices.reminderCount, row.reminderCount)),
      )
      .returning({ id: invoices.id });
    if (!claimed) continue;
    if (decision.status !== row.status) result.markedOverdue += 1;

    try {
      const graph = await loadInvoiceGraph(row.id);
      if (!graph) throw new Error('Invoice disappeared before the reminder was sent.');
      await sendPaymentReminder(graph, row.reminderCount + 1);
      result.remindersSent += 1;
    } catch (error) {
      await db
        .update(invoices)
        .set({
          status: decision.status,
          reminderCount: row.reminderCount,
          lastReminderAt: row.lastReminderAt,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, row.id));
      result.failures.push({
        invoiceId: row.id,
        message: error instanceof Error ? error.message : 'Email failed',
      });
    }
  }

  return result;
}
