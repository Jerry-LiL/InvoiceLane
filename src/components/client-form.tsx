'use client';

import { useActionState } from 'react';
import { saveClient } from '@/actions/clients';
import { fieldClass, primaryButton } from './ui';

type ClientInitial = {
  id?: string;
  name: string;
  email: string;
  company: string;
  address: string;
  phone: string;
};

export function ClientForm({ initial, submitLabel }: { initial: ClientInitial; submitLabel: string }) {
  const [state, action, pending] = useActionState(saveClient, {});

  return (
    <form action={action} className="space-y-4">
      {initial.id ? <input type="hidden" name="clientId" value={initial.id} /> : null}
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Name</span>
        <input name="name" required defaultValue={initial.name} className={fieldClass} autoComplete="name" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Email</span>
        <input name="email" type="email" required defaultValue={initial.email} className={fieldClass} autoComplete="email" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Company</span>
        <input name="company" defaultValue={initial.company} className={fieldClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Address</span>
        <textarea name="address" rows={3} defaultValue={initial.address} className={fieldClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Phone</span>
        <input name="phone" defaultValue={initial.phone} className={fieldClass} autoComplete="tel" />
      </label>
      {state.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
      <button type="submit" className={primaryButton} disabled={pending}>
        {pending ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
