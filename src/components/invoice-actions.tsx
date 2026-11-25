'use client';

import { useActionState } from 'react';
import { recordPayment, removeInvoice, sendInvoice } from '@/actions/invoices';
import type { InvoiceStatus } from '@/lib/invoice-status';
import { dangerButton, primaryButton, secondaryButton } from './ui';

export function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: InvoiceStatus }) {
  const [sendState, sendAction, sendPending] = useActionState(sendInvoice, {});
  const [payState, payAction, payPending] = useActionState(recordPayment, {});
  const [deleteState, deleteAction, deletePending] = useActionState(removeInvoice, {});

  return (
    <div className="flex flex-wrap items-start gap-3">
      {status === 'draft' ? (
        <>
          <form action={sendAction}>
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <button type="submit" className={primaryButton} disabled={sendPending}>
              {sendPending ? 'Sending...' : 'Send invoice'}
            </button>
            {sendState.error ? <p className="mt-2 max-w-xs text-sm text-stamp">{sendState.error}</p> : null}
          </form>
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!window.confirm('Delete this draft?')) event.preventDefault();
            }}
          >
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <button type="submit" className={dangerButton} disabled={deletePending}>
              {deletePending ? 'Deleting...' : 'Delete draft'}
            </button>
            {deleteState.error ? <p className="mt-2 max-w-xs text-sm text-stamp">{deleteState.error}</p> : null}
          </form>
        </>
      ) : null}
      {status === 'sent' || status === 'overdue' ? (
        <form action={payAction}>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <button type="submit" className={secondaryButton} disabled={payPending}>
            {payPending ? 'Saving...' : 'Mark paid'}
          </button>
          {payState.error ? <p className="mt-2 max-w-xs text-sm text-stamp">{payState.error}</p> : null}
        </form>
      ) : null}
      <a className={secondaryButton} href={`/api/invoices/${invoiceId}/pdf`}>
        Download PDF
      </a>
    </div>
  );
}
