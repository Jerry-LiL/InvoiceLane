import Link from 'next/link';
import { ClientForm } from '@/components/client-form';
import { PageHeader } from '@/components/page-header';
import { requireUser } from '@/lib/auth';
import { listClients } from '@/server/clients';

export const metadata = { title: 'Clients' };

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await listClients(user.id);

  return (
    <>
      <PageHeader title="Clients" lede="A client needs a name and an email. The address is printed on the PDF." />
      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-lg border border-line bg-card p-4">
          <h2 className="mb-4 font-serif text-xl">New client</h2>
          <ClientForm
            submitLabel="Add client"
            initial={{ name: '', email: '', company: '', address: '', phone: '' }}
          />
        </section>
        <section>
          {clients.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line bg-card px-4 py-8 text-sm text-muted">
              No clients yet. Add one before you write an invoice.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
              {clients.map((client) => (
                <li key={client.id}>
                  <Link href={`/dashboard/clients/${client.id}`} className="block px-4 py-3 hover:bg-paper">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{client.company ?? client.name}</span>
                      <span className="text-xs text-muted">
                        {client.invoiceCount} {client.invoiceCount === 1 ? 'invoice' : 'invoices'}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      {client.company ? `${client.name} · ` : ''}
                      {client.email}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
