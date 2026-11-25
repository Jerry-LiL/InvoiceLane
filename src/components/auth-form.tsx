'use client';

import { useActionState } from 'react';
import type { ActionState } from '@/lib/action-state';
import { fieldClass, primaryButton } from './ui';

type Field = {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
  minLength?: number;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  hidden,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Field[];
  submitLabel: string;
  hidden?: { name: string; value: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {hidden?.map((item) => (
        <input key={item.name} type="hidden" name={item.name} value={item.value} />
      ))}
      {fields.map((field) => (
        <label key={field.name} className="block">
          <span className="mb-1 block text-sm text-muted">{field.label}</span>
          <input
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
            minLength={field.minLength}
            className={fieldClass}
          />
        </label>
      ))}
      {state.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
      <button type="submit" className={`${primaryButton} w-full`} disabled={pending}>
        {pending ? 'Working...' : submitLabel}
      </button>
    </form>
  );
}
