import Link from 'next/link';
import { InvoiceForm } from '@/components/invoice-form';
import { PageHeader } from '@/components/page-header';
import { primaryButton } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { addDays, appToday } from '@/lib/dates';
import { listClients } from '@/server/clients';

export const metadata = { title: 'New invoice' };

export default async function NewInvoicePage() {
  const user = await requireUser();
  const clients = await listClients(user.id);
  const today = appToday();

  return (
    <>
      <PageHeader title="New invoice" lede="Save a draft first. You can send it once the lines look right." />
      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-card px-4 py-8">
          <p className="text-sm text-muted">Add a client before writing an invoice.</p>
          <Link href="/dashboard/clients" className={`${primaryButton} mt-4`}>
            Add a client
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-card p-4 md:p-6">
          <InvoiceForm
            submitLabel="Save draft"
            clients={clients.map((client) => ({ id: client.id, name: client.name, company: client.company }))}
            initial={{
              clientId: clients[0].id,
              issueDate: today,
              dueDate: addDays(today, 14),
              taxRate: '0.00',
              notes: '',
              lines: [{ key: 'new-line', description: '', quantity: '1', unitPrice: '' }],
            }}
          />
        </div>
      )}
    </>
  );
}
