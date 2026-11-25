import { notFound } from 'next/navigation';
import { ClientForm } from '@/components/client-form';
import { DeleteClientButton } from '@/components/delete-client-button';
import { InvoiceTable } from '@/components/invoice-table';
import { PageHeader } from '@/components/page-header';
import { requireUser } from '@/lib/auth';
import { getClient } from '@/server/clients';
import { listInvoices } from '@/server/invoices';

export const metadata = { title: 'Client' };

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const client = await getClient(user.id, id);
  if (!client) notFound();
  const invoices = await listInvoices(user.id, { clientId: client.id });

  return (
    <>
      <PageHeader title={client.company ?? client.name} lede={client.email} />
      <div className="space-y-8">
        <section className="max-w-xl space-y-6 rounded-lg border border-line bg-card p-4">
          <ClientForm
            submitLabel="Save client"
            initial={{
              id: client.id,
              name: client.name,
              email: client.email,
              company: client.company ?? '',
              address: client.address ?? '',
              phone: client.phone ?? '',
            }}
          />
          <DeleteClientButton clientId={client.id} />
          <p className="text-xs text-muted">A client with invoices stays on the account.</p>
        </section>
        <section>
          <h2 className="mb-3 font-serif text-2xl">Invoices</h2>
          <InvoiceTable rows={invoices} empty="No invoices for this client yet." />
        </section>
      </div>
    </>
  );
}
