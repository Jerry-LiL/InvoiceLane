import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { primaryButton, secondaryButton } from '@/components/ui';

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main id="main" className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-serif text-2xl tracking-tight">InvoiceLane</span>
        <div className="flex gap-3">
          {user ? (
            <Link href="/dashboard" className={primaryButton}>
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={secondaryButton}>
                Sign in
              </Link>
              <Link href="/signup" className={primaryButton}>
                Create account
              </Link>
            </>
          )}
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-12">
        <p className="text-sm uppercase tracking-[0.14em] text-pine">Invoicing desk</p>
        <h1 className="mt-3 max-w-xl font-serif text-5xl leading-tight tracking-tight">
          Clients, invoices, and a nudge when a due date slips.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/80">
          Write a draft with line items and tax, send a PDF, and let the reminder job mark overdue invoices and email
          the client. Totals are calculated in one module, then stored as the lines you can still read.
        </p>
      </section>
    </main>
  );
}
