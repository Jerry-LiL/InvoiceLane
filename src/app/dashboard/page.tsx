import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { InvoiceTable } from '@/components/invoice-table';
import { primaryButton } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import { listInvoices } from '@/server/invoices';

export const metadata = { title: 'Overview' };

export default async function DashboardPage() {
  const user = await requireUser();
  const invoices = await listInvoices(user.id);
  const outstanding = invoices
    .filter((invoice) => invoice.status === 'sent' || invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const paid = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const overdue = invoices.filter((invoice) => invoice.status === 'overdue').length;
  const drafts = invoices.filter((invoice) => invoice.status === 'draft').length;

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        lede="Outstanding balance is everything sent or overdue. Paid is the sum of invoices you have marked paid."
        action={
          <Link href="/dashboard/invoices/new" className={primaryButton}>
            New invoice
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Outstanding" value={formatMoney(outstanding)} />
        <Stat label="Overdue" value={String(overdue)} />
        <Stat label="Drafts" value={String(drafts)} />
        <Stat label="Paid" value={formatMoney(paid)} />
      </div>
      <h2 className="mb-3 mt-8 font-serif text-2xl">Recent invoices</h2>
      <InvoiceTable rows={invoices.slice(0, 8)} empty="No invoices yet. Add a client, then write the first draft." />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-serif text-3xl tabular-nums">{value}</p>
    </div>
  );
}
