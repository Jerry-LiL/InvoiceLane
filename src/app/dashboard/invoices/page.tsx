import Link from 'next/link';
import { InvoiceTable } from '@/components/invoice-table';
import { PageHeader } from '@/components/page-header';
import { primaryButton } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { INVOICE_STATUSES, isInvoiceStatus, type InvoiceStatus } from '@/lib/invoice-status';
import { statusLabel } from '@/lib/format';
import { listInvoices } from '@/server/invoices';

export const metadata = { title: 'Invoices' };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const requested = (await searchParams).status;
  const status: InvoiceStatus | undefined = requested && isInvoiceStatus(requested) ? requested : undefined;
  const invoices = await listInvoices(user.id, { status });

  const filters: { label: string; value?: InvoiceStatus }[] = [
    { label: 'All' },
    ...INVOICE_STATUSES.map((value) => ({ label: statusLabel(value), value })),
  ];

  return (
    <>
      <PageHeader
        title="Invoices"
        lede="Drafts can be edited. Sending locks the lines and emails the PDF."
        action={
          <Link href="/dashboard/invoices/new" className={primaryButton}>
            New invoice
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = filter.value === status || (!filter.value && !status);
          const href = filter.value ? `/dashboard/invoices?status=${filter.value}` : '/dashboard/invoices';
          return (
            <Link
              key={filter.label}
              href={href}
              className={`rounded-full px-3 py-1 text-sm ${active ? 'bg-pine text-paper' : 'bg-white text-ink ring-1 ring-line'}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
      <InvoiceTable
        rows={invoices}
        empty={status ? `No ${statusLabel(status).toLowerCase()} invoices.` : 'No invoices yet.'}
      />
    </>
  );
}
