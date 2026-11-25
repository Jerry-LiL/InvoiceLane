import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InvoiceActions } from '@/components/invoice-actions';
import { InvoiceForm } from '@/components/invoice-form';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { requireUser } from '@/lib/auth';
import { formatDisplayDate, formatTimestamp } from '@/lib/dates';
import { formatInvoiceNumber, formatMoney, formatScaled, formatTaxRate } from '@/lib/format';
import { lineTotalCents } from '@/lib/pricing';
import { listClients } from '@/server/clients';
import { loadInvoiceGraph } from '@/server/invoices';

export const metadata = { title: 'Invoice' };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const graph = await loadInvoiceGraph(id, user.id);
  if (!graph) notFound();

  const numberLabel = formatInvoiceNumber(graph.invoice.number);
  const clientLabel = graph.client.company ?? graph.client.name;

  return (
    <>
      <PageHeader
        title={numberLabel}
        lede={`${clientLabel} · due ${formatDisplayDate(graph.invoice.dueDate)}`}
        action={<StatusBadge status={graph.invoice.status} />}
      />
      <div className="mb-6">
        <InvoiceActions invoiceId={graph.invoice.id} status={graph.invoice.status} />
        {graph.invoice.status === 'draft' ? (
          <p className="mt-2 text-xs text-muted">Sending uses the last saved draft, including the PDF.</p>
        ) : null}
      </div>

      {graph.invoice.status === 'draft' ? (
        <DraftEditor userId={user.id} graph={graph} />
      ) : (
        <ReadOnlyInvoice graph={graph} />
      )}
    </>
  );
}

async function DraftEditor({
  userId,
  graph,
}: {
  userId: string;
  graph: NonNullable<Awaited<ReturnType<typeof loadInvoiceGraph>>>;
}) {
  const clients = await listClients(userId);
  return (
    <div className="rounded-lg border border-line bg-card p-4 md:p-6">
      <InvoiceForm
        submitLabel="Save draft"
        clients={clients.map((client) => ({ id: client.id, name: client.name, company: client.company }))}
        initial={{
          invoiceId: graph.invoice.id,
          clientId: graph.invoice.clientId,
          issueDate: graph.invoice.issueDate,
          dueDate: graph.invoice.dueDate,
          taxRate: formatScaled(graph.invoice.taxRateBps, 2),
          notes: graph.invoice.notes ?? '',
          lines: graph.lines.map((line) => ({
            key: line.id,
            description: line.description,
            quantity: formatScaled(line.quantityHundredths, 2),
            unitPrice: formatScaled(line.unitPriceCents, 2),
          })),
        }}
      />
    </div>
  );
}

function ReadOnlyInvoice({ graph }: { graph: NonNullable<Awaited<ReturnType<typeof loadInvoiceGraph>>> }) {
  return (
    <section className="rounded-lg border border-line bg-card p-4 md:p-6">
      <dl className="grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Issued</dt>
          <dd>{formatDisplayDate(graph.invoice.issueDate)}</dd>
        </div>
        <div>
          <dt className="text-muted">Due</dt>
          <dd>{formatDisplayDate(graph.invoice.dueDate)}</dd>
        </div>
        <div>
          <dt className="text-muted">Tax</dt>
          <dd>{formatTaxRate(graph.invoice.taxRateBps)}</dd>
        </div>
        <div>
          <dt className="text-muted">Bill to</dt>
          <dd>
            <Link href={`/dashboard/clients/${graph.client.id}`} className="hover:text-pine">
              {graph.client.name}
            </Link>
            <div className="text-muted">{graph.client.email}</div>
          </dd>
        </div>
        <div>
          <dt className="text-muted">Sent</dt>
          <dd>{graph.invoice.sentAt ? formatTimestamp(graph.invoice.sentAt) : 'Not sent'}</dd>
        </div>
        <div>
          <dt className="text-muted">Reminders</dt>
          <dd>
            {graph.invoice.reminderCount === 0
              ? 'None yet'
              : `${graph.invoice.reminderCount}, last ${
                  graph.invoice.lastReminderAt ? formatTimestamp(graph.invoice.lastReminderAt) : 'recorded'
                }`}
          </dd>
        </div>
      </dl>

      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted">
          <tr className="border-b border-line">
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 font-medium">Qty</th>
            <th className="py-2 font-medium">Price</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {graph.lines.map((line) => (
            <tr key={line.id} className="border-b border-line/80">
              <td className="py-2 pr-3">{line.description}</td>
              <td className="py-2 pr-3 tabular-nums">{formatScaled(line.quantityHundredths, 2)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatMoney(line.unitPriceCents)}</td>
              <td className="py-2 text-right tabular-nums">
                {formatMoney(
                  lineTotalCents({
                    quantityHundredths: line.quantityHundredths,
                    unitPriceCents: line.unitPriceCents,
                  }),
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(graph.totals.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Tax ({formatTaxRate(graph.invoice.taxRateBps)})</dt>
          <dd className="tabular-nums">{formatMoney(graph.totals.taxCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-base font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMoney(graph.totals.totalCents)}</dd>
        </div>
      </dl>

      {graph.invoice.notes ? (
        <div className="mt-6">
          <h2 className="text-sm text-muted">Notes</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{graph.invoice.notes}</p>
        </div>
      ) : null}
      {graph.invoice.paidAt ? (
        <p className="mt-6 text-sm text-paid">Paid {formatTimestamp(graph.invoice.paidAt)}.</p>
      ) : null}
    </section>
  );
}
