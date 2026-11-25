import { describe, expect, it } from 'vitest';
import { invoiceIssuedMessage, paymentReminderMessage } from './messages';

const letter = {
  clientName: 'Ada Ortega',
  numberLabel: 'INV-1001',
  totalLabel: '$2,273.25',
  dueDateLabel: 'Apr 16, 2026',
  fromName: 'Demo User',
};

describe('invoice letters', () => {
  it('includes the number, total, and due date on the invoice email', () => {
    const message = invoiceIssuedMessage(letter);
    expect(message.subject).toBe('Invoice INV-1001 from Demo User');
    expect(message.text).toContain('Ada Ortega');
    expect(message.text).toContain('INV-1001');
    expect(message.text).toContain('$2,273.25');
    expect(message.text).toContain('Apr 16, 2026');
  });

  it('numbers the reminder and says the invoice is overdue', () => {
    const message = paymentReminderMessage({ ...letter, reminderNumber: 2 });
    expect(message.subject).toContain('overdue');
    expect(message.text).toContain('reminder 2');
    expect(message.text).toContain('INV-1001');
  });
});
