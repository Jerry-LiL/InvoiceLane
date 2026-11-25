'use client';

import { useActionState } from 'react';
import { removeClient } from '@/actions/clients';
import { dangerButton } from './ui';

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(removeClient, {});
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm('Delete this client?')) event.preventDefault();
      }}
    >
      <input type="hidden" name="clientId" value={clientId} />
      <button type="submit" className={dangerButton} disabled={pending}>
        {pending ? 'Deleting...' : 'Delete client'}
      </button>
      {state.error ? <p className="mt-2 text-sm text-stamp">{state.error}</p> : null}
    </form>
  );
}
