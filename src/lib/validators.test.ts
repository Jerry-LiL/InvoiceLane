import { describe, expect, it } from 'vitest';
import { parseInvoiceForm } from './validators';

function invoiceForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set('clientId', overrides.clientId ?? crypto.randomUUID());
  form.set('issueDate', overrides.issueDate ?? '2026-05-01');
  form.set('dueDate', overrides.dueDate ?? '2026-05-15');
  form.set('taxRate', overrides.taxRate ?? '8.25');
  form.set('notes', overrides.notes ?? '');
  form.append('lineDescription', overrides.description ?? 'Catalog design');
  form.append('lineQuantity', overrides.quantity ?? '1.5');
  form.append('lineUnitPrice', overrides.unitPrice ?? '120.00');
  return form;
}

describe('parseInvoiceForm', () => {
  it('converts the form into cents, hundredths, and basis points', () => {
    const result = parseInvoiceForm(invoiceForm());
    expect(result).toMatchObject({
      issueDate: '2026-05-01',
      dueDate: '2026-05-15',
      taxRateBps: 825,
      notes: null,
      lines: [{ description: 'Catalog design', quantityHundredths: 150, unitPriceCents: 12_000 }],
    });
  });

  it('rejects a due date before the issue date and a blank line', () => {
    expect(parseInvoiceForm(invoiceForm({ dueDate: '2026-04-01' }))).toEqual({
      error: "Due date can't be earlier than the issue date.",
    });
    expect(parseInvoiceForm(invoiceForm({ quantity: '0' }))).toEqual({
      error: 'Line 1 quantity must be greater than 0, with up to 2 decimal places.',
    });
    expect(parseInvoiceForm(invoiceForm({ taxRate: '101' }))).toEqual({
      error: 'Tax rate must be between 0 and 100, with up to 2 decimal places.',
    });
  });
});
