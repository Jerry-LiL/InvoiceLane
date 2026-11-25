import type { InvoiceStatus } from './invoice-status';

export function formatScaled(value: number, scale: number): string {
  const negative = value < 0;
  const absolute = Math.abs(value);
  const factor = 10 ** scale;
  const whole = Math.floor(absolute / factor);
  const fraction = String(absolute % factor).padStart(scale, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function formatMoney(cents: number): string {
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}$${grouped}.${fraction}`;
}

export function formatTaxRate(bps: number): string {
  const trimmed = formatScaled(bps, 2).replace(/\.?0+$/, '');
  return `${trimmed}%`;
}

export function formatInvoiceNumber(number: number): string {
  return `INV-${number}`;
}

export function statusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'sent':
      return 'Sent';
    case 'paid':
      return 'Paid';
    case 'overdue':
      return 'Overdue';
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}
