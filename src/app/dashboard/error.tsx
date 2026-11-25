'use client';

import { secondaryButton } from '@/components/ui';

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-line bg-card p-6">
      <h1 className="font-serif text-2xl">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">The page could not be loaded. Check the database connection and try again.</p>
      <button type="button" className={`${secondaryButton} mt-4`} onClick={reset}>
        Try again
      </button>
    </div>
  );
}
