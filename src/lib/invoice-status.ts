export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue'] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const transitions: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ['sent'],
  sent: ['paid', 'overdue'],
  overdue: ['paid'],
  paid: [],
};

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return (INVOICE_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return transitions[from].includes(to);
}

// The due date itself is still open. Overdue starts the following day.
export function statusAfterSweep(status: InvoiceStatus, dueDate: string, today: string): InvoiceStatus {
  if (status === 'sent' && dueDate < today) return 'overdue';
  return status;
}

export type ReminderPolicy = {
  cooldownDays: number;
  maxReminders: number;
};

export const DEFAULT_REMINDER_POLICY: ReminderPolicy = {
  cooldownDays: 3,
  maxReminders: 4,
};

export type SweepInvoice = {
  id: string;
  status: InvoiceStatus;
  dueDate: string;
  lastReminderOn: string | null;
  reminderCount: number;
};

export type SweepDecision = {
  id: string;
  status: InvoiceStatus;
  sendReminder: boolean;
};

function daysBetween(earlier: string, later: string): number {
  const start = Date.parse(`${earlier}T00:00:00Z`);
  const end = Date.parse(`${later}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return Number.NaN;
  return Math.round((end - start) / 86_400_000);
}

export function planReminderSweep(
  invoices: SweepInvoice[],
  today: string,
  policy: ReminderPolicy = DEFAULT_REMINDER_POLICY,
): SweepDecision[] {
  const decisions: SweepDecision[] = [];
  for (const invoice of invoices) {
    if (invoice.status === 'draft' || invoice.status === 'paid') continue;
    const status = statusAfterSweep(invoice.status, invoice.dueDate, today);
    const cooledDown =
      invoice.lastReminderOn === null || daysBetween(invoice.lastReminderOn, today) >= policy.cooldownDays;
    const sendReminder = status === 'overdue' && invoice.reminderCount < policy.maxReminders && cooledDown;
    if (status !== invoice.status || sendReminder) {
      decisions.push({ id: invoice.id, status, sendReminder });
    }
  }
  return decisions;
}
