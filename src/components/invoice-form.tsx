'use client';

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
import { saveInvoice } from '@/actions/invoices';
import { formatMoney, formatTaxRate } from '@/lib/format';
import { invoiceTotals, lineTotalCents, parseScaledInteger } from '@/lib/pricing';
import { fieldClass, primaryButton, secondaryButton } from './ui';

type ClientOption = { id: string; name: string; company: string | null };

export type InvoiceLineDraft = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

export type InvoiceFormValues = {
  invoiceId?: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  taxRate: string;
  notes: string;
  lines: InvoiceLineDraft[];
};

function safeLine(quantity: string, unitPrice: string): { cents: number; line: { quantityHundredths: number; unitPriceCents: number } } | null {
  const quantityHundredths = parseScaledInteger(quantity, 2);
  const unitPriceCents = parseScaledInteger(unitPrice, 2);
  if (quantityHundredths === null || unitPriceCents === null) return null;
  try {
    const line = { quantityHundredths, unitPriceCents };
    return { cents: lineTotalCents(line), line };
  } catch {
    return null;
  }
}

function blankLine(): InvoiceLineDraft {
  return { key: crypto.randomUUID(), description: '', quantity: '1', unitPrice: '' };
}

export function InvoiceForm({
  clients,
  initial,
  submitLabel,
}: {
  clients: ClientOption[];
  initial: InvoiceFormValues;
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState(saveInvoice, {});
  const [lines, setLines] = useState(initial.lines.length > 0 ? initial.lines : [blankLine()]);
  const [taxRate, setTaxRate] = useState(initial.taxRate);

  const preview = useMemo(() => {
    const priced = lines.flatMap((line) => {
      const amount = safeLine(line.quantity, line.unitPrice);
      if (!amount) return [];
      return [amount.line];
    });
    const taxRateBps = parseScaledInteger(taxRate, 2);
    if (taxRateBps === null || taxRateBps > 10_000) {
      return { ready: false as const };
    }
    try {
      return { ready: true as const, totals: invoiceTotals(priced, taxRateBps), taxRateBps };
    } catch {
      return { ready: false as const };
    }
  }, [lines, taxRate]);

  function updateLine(key: string, patch: Partial<InvoiceLineDraft>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  return (
    <form action={action} className="space-y-6">
      {initial.invoiceId ? <input type="hidden" name="invoiceId" value={initial.invoiceId} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm text-muted">Client</span>
          <select name="clientId" defaultValue={initial.clientId} required className={fieldClass}>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company ? `${client.company} — ${client.name}` : client.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Issue date</span>
          <input name="issueDate" type="date" required defaultValue={initial.issueDate} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Due date</span>
          <input name="dueDate" type="date" required defaultValue={initial.dueDate} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Tax rate (%)</span>
          <input
            name="taxRate"
            inputMode="decimal"
            required
            value={taxRate}
            onChange={(event) => setTaxRate(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="hidden grid-cols-[1fr_90px_120px_100px_auto] gap-2 text-xs uppercase tracking-wide text-muted md:grid">
          <span>Description</span>
          <span>Qty</span>
          <span>Price</span>
          <span>Amount</span>
          <span />
        </div>
        {lines.map((line, index) => {
          const amount = safeLine(line.quantity, line.unitPrice)?.cents ?? null;
          return (
            <div key={line.key} className="grid gap-2 md:grid-cols-[1fr_90px_120px_100px_auto] md:items-center">
              <input
                name="lineDescription"
                aria-label={`Line ${index + 1} description`}
                value={line.description}
                onChange={(event) => updateLine(line.key, { description: event.target.value })}
                className={fieldClass}
                required
              />
              <input
                name="lineQuantity"
                aria-label={`Line ${index + 1} quantity`}
                inputMode="decimal"
                value={line.quantity}
                onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                className={fieldClass}
                required
              />
              <input
                name="lineUnitPrice"
                aria-label={`Line ${index + 1} price`}
                inputMode="decimal"
                value={line.unitPrice}
                onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
                className={fieldClass}
                required
              />
              <p className="px-1 text-sm tabular-nums text-muted">{amount === null ? '—' : formatMoney(amount)}</p>
              <button
                type="button"
                className={secondaryButton}
                disabled={lines.length === 1}
                onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
              >
                Remove
              </button>
            </div>
          );
        })}
        <button type="button" className={secondaryButton} onClick={() => setLines((current) => [...current, blankLine()])}>
          Add line
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">Notes</span>
        <textarea name="notes" rows={3} defaultValue={initial.notes} className={fieldClass} />
      </label>

      <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{preview.ready ? formatMoney(preview.totals.subtotalCents) : '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">{preview.ready ? `Tax (${formatTaxRate(preview.taxRateBps)})` : 'Tax'}</dt>
          <dd className="tabular-nums">{preview.ready ? formatMoney(preview.totals.taxCents) : '—'}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{preview.ready ? formatMoney(preview.totals.totalCents) : '—'}</dd>
        </div>
      </dl>

      {state.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
      <button type="submit" className={primaryButton} disabled={pending}>
        {pending ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
