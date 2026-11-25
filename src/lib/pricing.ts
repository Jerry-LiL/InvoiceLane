// Money is integer cents. Quantities are hundredths (150 = 1.50).
// Tax is basis points (825 = 8.25%). Each line is rounded half up to the
// nearest cent, then tax is rounded half up on the subtotal.

export const MAX_QUANTITY_HUNDREDTHS = 10_000_000;
export const MAX_UNIT_PRICE_CENTS = 100_000_000;
export const MAX_TAX_RATE_BPS = 10_000;

export type PricedLine = {
  quantityHundredths: number;
  unitPriceCents: number;
};

export type InvoiceTotals = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export function parseScaledInteger(input: string, scale: number): number | null {
  if (!Number.isInteger(scale) || scale < 0 || scale > 6) return null;
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  if (fraction.length > scale) return null;
  const digits = `${whole}${fraction.padEnd(scale, '0')}`.replace(/^0+(?=\d)/, '');
  const value = Number(digits);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

export function divRoundHalfUp(numerator: number, denominator: number): number {
  if (!Number.isInteger(numerator) || numerator < 0 || !Number.isInteger(denominator) || denominator <= 0) {
    throw new Error('Rounding expects a non-negative integer numerator and a positive integer denominator.');
  }
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  if (remainder * 2 >= denominator) return quotient + 1;
  return quotient;
}

function assertLine(line: PricedLine): void {
  if (
    !Number.isInteger(line.quantityHundredths) ||
    line.quantityHundredths <= 0 ||
    line.quantityHundredths > MAX_QUANTITY_HUNDREDTHS
  ) {
    throw new Error('Quantity must be a positive number of hundredths within the allowed range.');
  }
  if (
    !Number.isInteger(line.unitPriceCents) ||
    line.unitPriceCents < 0 ||
    line.unitPriceCents > MAX_UNIT_PRICE_CENTS
  ) {
    throw new Error('Unit price must be a non-negative number of cents within the allowed range.');
  }
}

export function lineTotalCents(line: PricedLine): number {
  assertLine(line);
  return divRoundHalfUp(line.quantityHundredths * line.unitPriceCents, 100);
}

export function invoiceTotals(lines: PricedLine[], taxRateBps: number): InvoiceTotals {
  if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > MAX_TAX_RATE_BPS) {
    throw new Error('Tax rate must be an integer number of basis points from 0 to 10000.');
  }
  let subtotalCents = 0;
  for (const line of lines) {
    subtotalCents += lineTotalCents(line);
  }
  const taxCents = divRoundHalfUp(subtotalCents * taxRateBps, 10_000);
  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}
