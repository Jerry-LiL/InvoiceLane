import { z } from 'zod';
import { MAX_QUANTITY_HUNDREDTHS, MAX_UNIT_PRICE_CENTS, parseScaledInteger } from './pricing';

const MAX_LINES = 40;

const emailField = z
  .string()
  .trim()
  .max(200, 'Email is too long.')
  .pipe(z.email('Enter a valid email address.'))
  .transform((value) => value.toLowerCase());

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'That field is too long.')
    .transform((value) => (value.length === 0 ? null : value));

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120, 'Name is too long.'),
  email: emailField,
  password: z.string().min(8, 'Use at least 8 characters.').max(200, 'Password is too long.'),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required.').max(200, 'Password is too long.'),
});

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120, 'Name is too long.'),
  email: emailField,
  company: optionalText(120),
  address: optionalText(500),
  phone: optionalText(40),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a real date.');

const invoiceFieldsSchema = z
  .object({
    clientId: z.uuid('Choose a client.'),
    issueDate: isoDate,
    dueDate: isoDate,
    taxRate: z.string(),
    notes: optionalText(2000),
  })
  .refine((value) => value.dueDate >= value.issueDate, {
    message: "Due date can't be earlier than the issue date.",
    path: ['dueDate'],
  });

export type ClientInput = z.infer<typeof clientSchema>;

export type InvoiceLineInput = {
  description: string;
  quantityHundredths: number;
  unitPriceCents: number;
};

export type InvoiceInput = {
  clientId: string;
  issueDate: string;
  dueDate: string;
  taxRateBps: number;
  notes: string | null;
  lines: InvoiceLineInput[];
};

function issueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Check the form and try again.';
}

export function parseClientForm(formData: FormData): ClientInput | { error: string } {
  const result = clientSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    company: formData.get('company') ?? '',
    address: formData.get('address') ?? '',
    phone: formData.get('phone') ?? '',
  });
  if (!result.success) return { error: issueMessage(result.error) };
  return result.data;
}

export function parseTaxRateBps(raw: string): number | null {
  const bps = parseScaledInteger(raw, 2);
  if (bps === null || bps > 10_000) return null;
  return bps;
}

function parseLines(formData: FormData): InvoiceLineInput[] | { error: string } {
  const descriptions = formData.getAll('lineDescription');
  const quantities = formData.getAll('lineQuantity');
  const prices = formData.getAll('lineUnitPrice');
  if (descriptions.length === 0) return { error: 'Add at least one line item.' };
  if (descriptions.length > MAX_LINES) return { error: `Keep an invoice to ${MAX_LINES} lines or fewer.` };
  if (quantities.length !== descriptions.length || prices.length !== descriptions.length) {
    return { error: 'Each line needs a description, quantity, and price.' };
  }

  const lines: InvoiceLineInput[] = [];
  for (let index = 0; index < descriptions.length; index += 1) {
    const description = String(descriptions[index] ?? '').trim();
    if (!description) return { error: `Line ${index + 1} needs a description.` };
    if (description.length > 240) return { error: `Line ${index + 1} description is too long.` };
    const quantityHundredths = parseScaledInteger(String(quantities[index] ?? ''), 2);
    const unitPriceCents = parseScaledInteger(String(prices[index] ?? ''), 2);
    if (
      quantityHundredths === null ||
      quantityHundredths <= 0 ||
      quantityHundredths > MAX_QUANTITY_HUNDREDTHS
    ) {
      return { error: `Line ${index + 1} quantity must be greater than 0, with up to 2 decimal places.` };
    }
    if (unitPriceCents === null || unitPriceCents < 0 || unitPriceCents > MAX_UNIT_PRICE_CENTS) {
      return { error: `Line ${index + 1} price must be 0 or more, with up to 2 decimal places.` };
    }
    lines.push({ description, quantityHundredths, unitPriceCents });
  }
  return lines;
}

export function parseInvoiceForm(formData: FormData): InvoiceInput | { error: string } {
  const fields = invoiceFieldsSchema.safeParse({
    clientId: formData.get('clientId'),
    issueDate: formData.get('issueDate'),
    dueDate: formData.get('dueDate'),
    taxRate: formData.get('taxRate') ?? '',
    notes: formData.get('notes') ?? '',
  });
  if (!fields.success) return { error: issueMessage(fields.error) };
  const taxRateBps = parseTaxRateBps(String(fields.data.taxRate));
  if (taxRateBps === null) {
    return { error: 'Tax rate must be between 0 and 100, with up to 2 decimal places.' };
  }
  const lines = parseLines(formData);
  if ('error' in lines) return lines;
  return {
    clientId: fields.data.clientId,
    issueDate: fields.data.issueDate,
    dueDate: fields.data.dueDate,
    notes: fields.data.notes,
    taxRateBps,
    lines,
  };
}
