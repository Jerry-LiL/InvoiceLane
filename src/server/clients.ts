import { and, asc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { clients, invoices } from '@/db/schema';
import type { ClientInput } from '@/lib/validators';

export type ClientListItem = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  invoiceCount: number;
};

export async function listClients(userId: string): Promise<ClientListItem[]> {
  const rows = await getDb()
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      company: clients.company,
      phone: clients.phone,
      invoiceCount: sql<number>`cast(count(${invoices.id}) as int)`,
    })
    .from(clients)
    .leftJoin(invoices, eq(invoices.clientId, clients.id))
    .where(eq(clients.userId, userId))
    .groupBy(clients.id)
    .orderBy(asc(clients.name));

  return rows
    .map((row) => ({ ...row, invoiceCount: Number(row.invoiceCount) }))
    .sort((a, b) => {
      const label = (client: { company: string | null; name: string }) =>
        (client.company || client.name).toLocaleLowerCase();
      return label(a).localeCompare(label(b)) || a.name.localeCompare(b.name);
    });
}

export async function getClient(userId: string, clientId: string) {
  const [client] = await getDb()
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .limit(1);
  return client ?? null;
}

export async function createClient(userId: string, input: ClientInput) {
  const [client] = await getDb()
    .insert(clients)
    .values({ userId, ...input })
    .returning({ id: clients.id });
  return client;
}

export async function updateClient(userId: string, clientId: string, input: ClientInput) {
  const [client] = await getDb()
    .update(clients)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .returning({ id: clients.id });
  return client ?? null;
}

export async function deleteClient(userId: string, clientId: string): Promise<{ ok: true } | { error: string }> {
  const [existing] = await getDb()
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .limit(1);
  if (!existing) return { error: 'Client not found.' };

  const [invoice] = await getDb()
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.clientId, clientId))
    .limit(1);
  if (invoice) return { error: 'This client still has invoices.' };

  await getDb().delete(clients).where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
  return { ok: true };
}
