'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/action-state';
import { requireUser } from '@/lib/auth';
import { parseClientForm } from '@/lib/validators';
import { createClient, deleteClient, updateClient } from '@/server/clients';

export async function saveClient(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseClientForm(formData);
  if ('error' in parsed) return parsed;

  const clientId = String(formData.get('clientId') ?? '');
  if (clientId) {
    const updated = await updateClient(user.id, clientId, parsed);
    if (!updated) return { error: 'Client not found.' };
    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${clientId}`);
    redirect(`/dashboard/clients/${clientId}`);
  }

  const created = await createClient(user.id, parsed);
  revalidatePath('/dashboard/clients');
  redirect(`/dashboard/clients/${created.id}`);
}

export async function removeClient(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const clientId = String(formData.get('clientId') ?? '');
  const result = await deleteClient(user.id, clientId);
  if ('error' in result) return result;
  revalidatePath('/dashboard/clients');
  redirect('/dashboard/clients');
}
