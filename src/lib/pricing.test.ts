import { describe, expect, it } from 'vitest';
import { divRoundHalfUp, invoiceTotals, lineTotalCents, parseScaledInteger } from './pricing';

describe('parseScaledInteger', () => {
  it('reads a decimal string into scaled integers', () => {
    expect(parseScaledInteger('1.5', 2)).toBe(150);
    expect(parseScaledInteger('1.50', 2)).toBe(150);
    expect(parseScaledInteger('8.25', 2)).toBe(825);
    expect(parseScaledInteger('100', 2)).toBe(10_000);
    expect(parseScaledInteger(' 0.01 ', 2)).toBe(1);
    expect(parseScaledInteger('01.5', 2)).toBe(150);
  });

  it('rejects extra precision, signs, and blank input', () => {
    expect(parseScaledInteger('1.555', 2)).toBeNull();
    expect(parseScaledInteger('-1', 2)).toBeNull();
    expect(parseScaledInteger('', 2)).toBeNull();
    expect(parseScaledInteger('1.', 2)).toBeNull();
    expect(parseScaledInteger('1e2', 2)).toBeNull();
  });
});

describe('divRoundHalfUp', () => {
  it('rounds a remainder of one half away from zero', () => {
    expect(divRoundHalfUp(50, 100)).toBe(1);
    expect(divRoundHalfUp(49, 100)).toBe(0);
    expect(divRoundHalfUp(150, 100)).toBe(2);
  });
});

describe('line totals', () => {
  it('multiplies quantity hundredths by the unit price and rounds half up', () => {
    expect(lineTotalCents({ quantityHundredths: 150, unitPriceCents: 1000 })).toBe(1500);
    expect(lineTotalCents({ quantityHundredths: 101, unitPriceCents: 100 })).toBe(101);
    expect(lineTotalCents({ quantityHundredths: 33, unitPriceCents: 1000 })).toBe(330);
    expect(lineTotalCents({ quantityHundredths: 1, unitPriceCents: 50 })).toBe(1);
    expect(lineTotalCents({ quantityHundredths: 1, unitPriceCents: 1 })).toBe(0);
  });

  it('rejects a zero quantity and a price above the cap', () => {
    expect(() => lineTotalCents({ quantityHundredths: 0, unitPriceCents: 100 })).toThrow(/Quantity/);
    expect(() => lineTotalCents({ quantityHundredths: 100, unitPriceCents: -1 })).toThrow(/Unit price/);
  });
});

describe('invoiceTotals', () => {
  const lines = [
    { quantityHundredths: 100, unitPriceCents: 180_000 },
    { quantityHundredths: 250, unitPriceCents: 12_000 },
  ];

  it('sums rounded lines and applies tax in basis points', () => {
    expect(invoiceTotals(lines, 0)).toEqual({
      subtotalCents: 210_000,
      taxCents: 0,
      totalCents: 210_000,
    });
    expect(invoiceTotals(lines, 825)).toEqual({
      subtotalCents: 210_000,
      taxCents: 17_325,
      totalCents: 227_325,
    });
  });

  it('rounds a half cent of tax up', () => {
    const totals = invoiceTotals([{ quantityHundredths: 100, unitPriceCents: 5 }], 1000);
    expect(totals).toEqual({ subtotalCents: 5, taxCents: 1, totalCents: 6 });
  });

  it('rounds a tenth of a cent of tax down', () => {
    const totals = invoiceTotals([{ quantityHundredths: 100, unitPriceCents: 1001 }], 1000);
    expect(totals.taxCents).toBe(100);
  });

  it('returns zeros for an empty line list when tax is valid', () => {
    expect(invoiceTotals([], 500)).toEqual({ subtotalCents: 0, taxCents: 0, totalCents: 0 });
  });

  it('rejects a tax rate outside 0 to 100 percent', () => {
    expect(() => invoiceTotals(lines, -1)).toThrow(/Tax rate/);
    expect(() => invoiceTotals(lines, 10_001)).toThrow(/Tax rate/);
  });
});
