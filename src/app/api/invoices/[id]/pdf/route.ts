import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { renderInvoicePdf } from '@/lib/pdf';
import { formatInvoiceNumber } from '@/lib/format';
import { pdfModelFor } from '@/server/deliver';
import { loadInvoiceGraph } from '@/server/invoices';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await context.params;
  const graph = await loadInvoiceGraph(id, user.id);
  if (!graph) return new NextResponse('Not found', { status: 404 });

  const bytes = await renderInvoicePdf(pdfModelFor(graph));
  const filename = `${formatInvoiceNumber(graph.invoice.number)}.pdf`;
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
