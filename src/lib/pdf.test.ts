import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { renderInvoicePdf, type InvoicePdfModel } from './pdf';

function model(lineCount: number): InvoicePdfModel {
  return {
    numberLabel: 'INV-1001',
    statusLabel: 'Draft',
    fromLines: ['Demo User', 'demo@invoicelane.dev'],
    billToLines: ['Northwind Studio', 'Ada Ortega', '18 Harbor Street', 'Portland, OR'],
    issueDateLabel: 'Apr 2, 2026',
    dueDateLabel: 'Apr 16, 2026',
    lines: Array.from({ length: lineCount }, (_, index) => ({
      description: `Line ${index + 1} for catalog production and review`,
      quantityLabel: '1.00',
      unitPriceLabel: '$120.00',
      amountLabel: '$120.00',
    })),
    subtotalLabel: '$120.00',
    taxLabel: 'Tax (8.25%)',
    taxAmountLabel: '$9.90',
    totalLabel: '$129.90',
    notes: 'Thank you.\nPayment by bank transfer.',
  };
}

describe('renderInvoicePdf', () => {
  it('returns a PDF document', async () => {
    const bytes = await renderInvoicePdf(model(2));
    expect(Buffer.from(bytes).subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(bytes.byteLength).toBeGreaterThan(800);
  });

  it('paginates a long list of lines', async () => {
    const short = await PDFDocument.load(await renderInvoicePdf(model(2)));
    const long = await PDFDocument.load(await renderInvoicePdf(model(40)));
    expect(short.getPageCount()).toBe(1);
    expect(long.getPageCount()).toBeGreaterThan(1);
  });
});
