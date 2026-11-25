import Link from 'next/link';
import { formatDisplayDate } from '@/lib/dates';
import { formatInvoiceNumber, formatMoney } from '@/lib/format';
import type { InvoiceListItem } from '@/server/invoices';
import { StatusBadge } from './status-badge';

export function InvoiceTable({ rows, empty }: { rows: InvoiceListItem[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="rounded-lg border border-dashed border-line bg-card px-4 py-8 text-sm text-muted">{empty}</p>;
  }

  return (
    <>
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/dashboard/invoices/${row.id}`} className="block px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-serif text-base whitespace-nowrap">{formatInvoiceNumber(row.number)}</span>
                <StatusBadge status={row.status} />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-muted">{row.clientCompany ?? row.clientName}</span>
                <span className="shrink-0 tabular-nums">{formatMoney(row.totalCents)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">Due {formatDisplayDate(row.dueDate)}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-lg border border-line bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-3 font-medium">Invoice</th>
              <th className="px-3 py-3 font-medium">Client</th>
              <th className="px-3 py-3 font-medium">Issued</th>
              <th className="px-3 py-3 font-medium">Due</th>
              <th className="px-3 py-3 font-medium">Total</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line/80 last:border-0">
                <td className="px-3 py-3 whitespace-nowrap">
                  <Link href={`/dashboard/invoices/${row.id}`} className="font-serif text-base hover:text-pine">
                    {formatInvoiceNumber(row.number)}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <div className="truncate">{row.clientCompany ?? row.clientName}</div>
                  {row.clientCompany ? <div className="truncate text-xs text-muted">{row.clientName}</div> : null}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDisplayDate(row.issueDate)}</td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDisplayDate(row.dueDate)}</td>
                <td className="px-3 py-3 whitespace-nowrap tabular-nums">{formatMoney(row.totalCents)}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
