import type { InvoiceStatus } from '@/lib/invoice-status';
import { statusLabel } from '@/lib/format';

const tones: Record<InvoiceStatus, string> = {
  draft: 'bg-draft-soft text-draft',
  sent: 'bg-sent-soft text-sent',
  paid: 'bg-paid-soft text-paid',
  overdue: 'bg-stamp-soft text-stamp',
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[status]}`}>
      {statusLabel(status)}
    </span>
  );
}
