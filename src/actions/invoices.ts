'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/action-state';
import { requireUser } from '@/lib/auth';
import { appToday } from '@/lib/dates';
import { canTransition, statusAfterSweep } from '@/lib/invoice-status';
import { parseInvoiceForm } from '@/lib/validators';
import { sendIssuedInvoice } from '@/server/deliver';
import {
  createInvoice,
  deleteDraftInvoice,
  loadInvoiceGraph,
  markInvoicePaid,
  markInvoiceSent,
  updateDraftInvoice,
} from '@/server/invoices';

function refreshInvoice(id?: string) {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/invoices');
  revalidatePath('/dashboard/clients');
  if (id) revalidatePath(`/dashboard/invoices/${id}`);
}

export async function saveInvoice(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseInvoiceForm(formData);
  if ('error' in parsed) return parsed;

  const invoiceId = String(formData.get('invoiceId') ?? '');
  if (invoiceId) {
    const updated = await updateDraftInvoice(user.id, invoiceId, parsed);
    if ('error' in updated) return updated;
    refreshInvoice(invoiceId);
    redirect(`/dashboard/invoices/${invoiceId}`);
  }

  const created = await createInvoice(user.id, parsed);
  if ('error' in created) return created;
  refreshInvoice(created.id);
  redirect(`/dashboard/invoices/${created.id}`);
}

export async function removeInvoice(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const result = await deleteDraftInvoice(user.id, invoiceId);
  if ('error' in result) return result;
  refreshInvoice();
  redirect('/dashboard/invoices');
}

export async function sendInvoice(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const graph = await loadInvoiceGraph(invoiceId, user.id);
  if (!graph) return { error: 'Invoice not found.' };
  if (!canTransition(graph.invoice.status, 'sent')) return { error: 'Only drafts can be sent.' };

  const nextStatus = statusAfterSweep('sent', graph.invoice.dueDate, appToday());
  if (nextStatus !== 'sent' && nextStatus !== 'overdue') {
    return { error: 'This draft cannot be sent.' };
  }

  try {
    await sendIssuedInvoice(graph, nextStatus);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not send the invoice email.' };
  }

  const marked = await markInvoiceSent(user.id, invoiceId, nextStatus);
  if ('error' in marked) return marked;
  refreshInvoice(invoiceId);
  redirect(`/dashboard/invoices/${invoiceId}`);
}

export async function recordPayment(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const graph = await loadInvoiceGraph(invoiceId, user.id);
  if (!graph) return { error: 'Invoice not found.' };
  if (!canTransition(graph.invoice.status, 'paid')) {
    return { error: 'Only sent or overdue invoices can be marked paid.' };
  }
  const marked = await markInvoicePaid(user.id, invoiceId);
  if ('error' in marked) return marked;
  refreshInvoice(invoiceId);
  redirect(`/dashboard/invoices/${invoiceId}`);
}
