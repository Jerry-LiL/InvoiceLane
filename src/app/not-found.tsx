import Link from 'next/link';
import { primaryButton } from '@/components/ui';

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-24">
      <h1 className="font-serif text-4xl">That page is not here.</h1>
      <p className="mt-3 text-muted">The link may be old, or the invoice may belong to another account.</p>
      <Link href="/dashboard" className={`${primaryButton} mt-6`}>
        Back to the dashboard
      </Link>
    </main>
  );
}
