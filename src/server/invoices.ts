import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { clients, invoices, lineItems, users } from '@/db/schema';
import type { InvoiceStatus } from '@/lib/invoice-status';
import { invoiceTotals, type InvoiceTotals } from '@/lib/pricing';
import type { InvoiceInput } from '@/lib/validators';

export type InvoiceGraph = {
  invoice: typeof invoices.$inferSelect;
  client: typeof clients.$inferSelect;
  user: { id: string; name: string; email: string };
  lines: Array<typeof lineItems.$inferSelect>;
  totals: InvoiceTotals;
};

export type InvoiceListItem = {
  id: string;
  number: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  clientId: string;
  clientName: string;
  clientCompany: string | null;
  totalCents: number;
};

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === '23505' || candidate.cause?.code === '23505';
}

function lineRows(invoiceId: string, lines: InvoiceInput['lines']) {
  return lines.map((line, position) => ({
    invoiceId,
    position,
    description: line.description,
    quantityHundredths: line.quantityHundredths,
    unitPriceCents: line.unitPriceCents,
  }));
}

async function clientBelongsToUser(userId: string, clientId: string): Promise<boolean> {
  const [client] = await getDb()
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .limit(1);
  return Boolean(client);
}

export async function listInvoices(
  userId: string,
  filter: { status?: InvoiceStatus; clientId?: string } = {},
): Promise<InvoiceListItem[]> {
  const db = getDb();
  const filters = [eq(invoices.userId, userId)];
  if (filter.status) filters.push(eq(invoices.status, filter.status));
  if (filter.clientId) filters.push(eq(invoices.clientId, filter.clientId));

  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      taxRateBps: invoices.taxRateBps,
      clientId: invoices.clientId,
      clientName: clients.name,
      clientCompany: clients.company,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(...filters))
    .orderBy(desc(invoices.number));

  const ids = rows.map((row) => row.id);
  const items =
    ids.length === 0 ? [] : await db.select().from(lineItems).where(inArray(lineItems.invoiceId, ids));
  const grouped = new Map<string, { quantityHundredths: number; unitPriceCents: number }[]>();
  for (const item of items) {
    const bucket = grouped.get(item.invoiceId) ?? [];
    bucket.push({ quantityHundredths: item.quantityHundredths, unitPriceCents: item.unitPriceCents });
    grouped.set(item.invoiceId, bucket);
  }

  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    status: row.status,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    clientId: row.clientId,
    clientName: row.clientName,
    clientCompany: row.clientCompany,
    totalCents: invoiceTotals(grouped.get(row.id) ?? [], row.taxRateBps).totalCents,
  }));
}

export async function loadInvoiceGraph(invoiceId: string, userId?: string): Promise<InvoiceGraph | null> {
  const filters = [eq(invoices.id, invoiceId)];
  if (userId) filters.push(eq(invoices.userId, userId));
  const [row] = await getDb()
    .select()
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .innerJoin(users, eq(invoices.userId, users.id))
    .where(and(...filters))
    .limit(1);
  if (!row) return null;

  const lines = await getDb()
    .select()
    .from(lineItems)
    .where(eq(lineItems.invoiceId, invoiceId))
    .orderBy(asc(lineItems.position));

  return {
    invoice: row.invoices,
    client: row.clients,
    user: { id: row.users.id, name: row.users.name, email: row.users.email },
    lines,
    totals: invoiceTotals(
      lines.map((line) => ({
        quantityHundredths: line.quantityHundredths,
        unitPriceCents: line.unitPriceCents,
      })),
      row.invoices.taxRateBps,
    ),
  };
}

export async function createInvoice(userId: string, input: InvoiceInput): Promise<{ id: string } | { error: string }> {
  if (!(await clientBelongsToUser(userId, input.clientId))) {
    return { error: 'Choose a client from your list.' };
  }
  const db = getDb();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const created = await db.transaction(async (tx) => {
        const [row] = await tx
          .select({ maxNumber: sql<number>`coalesce(max(${invoices.number}), 1000)` })
          .from(invoices)
          .where(eq(invoices.userId, userId));
        const number = Number(row?.maxNumber ?? 1000) + 1;
        const [invoice] = await tx
          .insert(invoices)
          .values({
            userId,
            clientId: input.clientId,
            number,
            status: 'draft',
            issueDate: input.issueDate,
            dueDate: input.dueDate,
            taxRateBps: input.taxRateBps,
            notes: input.notes,
          })
          .returning({ id: invoices.id });
        await tx.insert(lineItems).values(lineRows(invoice.id, input.lines));
        return invoice;
      });
      return { id: created.id };
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 2) continue;
      throw error;
    }
  }
  return { error: 'Could not allocate an invoice number. Try again.' };
}

export async function updateDraftInvoice(
  userId: string,
  invoiceId: string,
  input: InvoiceInput,
): Promise<{ id: string } | { error: string }> {
  if (!(await clientBelongsToUser(userId, input.clientId))) {
    return { error: 'Choose a client from your list.' };
  }
  return getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select({ status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
      .limit(1);
    if (!existing) return { error: 'Invoice not found.' };
    if (existing.status !== 'draft') return { error: 'Only drafts can be edited.' };
    await tx
      .update(invoices)
      .set({
        clientId: input.clientId,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        taxRateBps: input.taxRateBps,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));
    await tx.delete(lineItems).where(eq(lineItems.invoiceId, invoiceId));
    await tx.insert(lineItems).values(lineRows(invoiceId, input.lines));
    return { id: invoiceId };
  });
}

export async function deleteDraftInvoice(
  userId: string,
  invoiceId: string,
): Promise<{ ok: true } | { error: string }> {
  const [existing] = await getDb()
    .select({ status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .limit(1);
  if (!existing) return { error: 'Invoice not found.' };
  if (existing.status !== 'draft') return { error: 'Only drafts can be deleted.' };
  await getDb().delete(invoices).where(eq(invoices.id, invoiceId));
  return { ok: true };
}

export async function markInvoiceSent(
  userId: string,
  invoiceId: string,
  status: 'sent' | 'overdue',
  now = new Date(),
): Promise<{ ok: true } | { error: string }> {
  const [updated] = await getDb()
    .update(invoices)
    .set({
      status,
      sentAt: now,
      lastReminderAt: now,
      updatedAt: now,
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId), eq(invoices.status, 'draft')))
    .returning({ id: invoices.id });
  if (!updated) return { error: 'Only drafts can be sent.' };
  return { ok: true };
}

export async function markInvoicePaid(
  userId: string,
  invoiceId: string,
  now = new Date(),
): Promise<{ ok: true } | { error: string }> {
  const [updated] = await getDb()
    .update(invoices)
    .set({ status: 'paid', paidAt: now, updatedAt: now })
    .where(
      and(eq(invoices.id, invoiceId), eq(invoices.userId, userId), inArray(invoices.status, ['sent', 'overdue'])),
    )
    .returning({ id: invoices.id });
  if (!updated) return { error: 'Only sent or overdue invoices can be marked paid.' };
  return { ok: true };
}
