import { sendEmail } from '@/lib/email';
import { formatDisplayDate } from '@/lib/dates';
import { formatInvoiceNumber, formatMoney, formatScaled, formatTaxRate, statusLabel } from '@/lib/format';
import type { InvoiceStatus } from '@/lib/invoice-status';
import { invoiceIssuedMessage, paymentReminderMessage } from '@/lib/messages';
import { renderInvoicePdf, type InvoicePdfModel } from '@/lib/pdf';
import { lineTotalCents } from '@/lib/pricing';
import type { InvoiceGraph } from './invoices';

function addressLines(parts: Array<string | null>): string[] {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .flatMap((part) =>
      part
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    );
}

export function pdfModelFor(graph: InvoiceGraph, status: InvoiceStatus = graph.invoice.status): InvoicePdfModel {
  return {
    numberLabel: formatInvoiceNumber(graph.invoice.number),
    statusLabel: statusLabel(status),
    fromLines: [graph.user.name, graph.user.email],
    billToLines: addressLines([
      graph.client.company,
      graph.client.name,
      graph.client.address,
      graph.client.phone,
      graph.client.email,
    ]),
    issueDateLabel: formatDisplayDate(graph.invoice.issueDate),
    dueDateLabel: formatDisplayDate(graph.invoice.dueDate),
    lines: graph.lines.map((line) => ({
      description: line.description,
      quantityLabel: formatScaled(line.quantityHundredths, 2),
      unitPriceLabel: formatMoney(line.unitPriceCents),
      amountLabel: formatMoney(
        lineTotalCents({
          quantityHundredths: line.quantityHundredths,
          unitPriceCents: line.unitPriceCents,
        }),
      ),
    })),
    subtotalLabel: formatMoney(graph.totals.subtotalCents),
    taxLabel: `Tax (${formatTaxRate(graph.invoice.taxRateBps)})`,
    taxAmountLabel: formatMoney(graph.totals.taxCents),
    totalLabel: formatMoney(graph.totals.totalCents),
    notes: graph.invoice.notes,
  };
}

function letterFields(graph: InvoiceGraph) {
  return {
    clientName: graph.client.name,
    numberLabel: formatInvoiceNumber(graph.invoice.number),
    totalLabel: formatMoney(graph.totals.totalCents),
    dueDateLabel: formatDisplayDate(graph.invoice.dueDate),
    fromName: graph.user.name,
  };
}

async function attachmentFor(graph: InvoiceGraph, status?: InvoiceStatus) {
  const bytes = await renderInvoicePdf(pdfModelFor(graph, status));
  return {
    filename: `${formatInvoiceNumber(graph.invoice.number)}.pdf`,
    content: Buffer.from(bytes),
    contentType: 'application/pdf',
  };
}

export async function sendIssuedInvoice(graph: InvoiceGraph, status: InvoiceStatus): Promise<void> {
  const message = invoiceIssuedMessage(letterFields(graph));
  await sendEmail({
    to: graph.client.email,
    subject: message.subject,
    text: message.text,
    attachment: await attachmentFor(graph, status),
  });
}

export async function sendPaymentReminder(graph: InvoiceGraph, reminderNumber: number): Promise<void> {
  const message = paymentReminderMessage({ ...letterFields(graph), reminderNumber });
  await sendEmail({
    to: graph.client.email,
    subject: message.subject,
    text: message.text,
    attachment: await attachmentFor(graph),
  });
}
