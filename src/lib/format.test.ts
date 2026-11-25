import { describe, expect, it } from 'vitest';
import { formatInvoiceNumber, formatMoney, formatScaled, formatTaxRate, statusLabel } from './format';

describe('format', () => {
  it('formats cents without using binary fractions', () => {
    expect(formatMoney(227_325)).toBe('$2,273.25');
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(99)).toBe('$0.99');
    expect(formatMoney(-125)).toBe('-$1.25');
  });

  it('trims trailing zeros on a tax rate', () => {
    expect(formatTaxRate(825)).toBe('8.25%');
    expect(formatTaxRate(1000)).toBe('10%');
    expect(formatTaxRate(0)).toBe('0%');
    expect(formatTaxRate(805)).toBe('8.05%');
  });

  it('keeps two decimal places for scaled quantities', () => {
    expect(formatScaled(250, 2)).toBe('2.50');
    expect(formatInvoiceNumber(1001)).toBe('INV-1001');
    expect(statusLabel('overdue')).toBe('Overdue');
  });
});
