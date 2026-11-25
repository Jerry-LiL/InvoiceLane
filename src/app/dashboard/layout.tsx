import Link from 'next/link';
import { SideNav } from '@/components/side-nav';
import { SignOutButton } from '@/components/sign-out-button';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="bg-pine text-paper">
        <div className="flex flex-col gap-4 px-4 py-4 md:min-h-screen md:py-6">
          <Link href="/dashboard" className="font-serif text-2xl tracking-tight">
            InvoiceLane
          </Link>
          <SideNav />
          <div className="md:mt-auto">
            <p className="truncate text-sm">{user.name}</p>
            <p className="truncate text-xs text-white/60">{user.email}</p>
            <div className="mt-2">
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>
      <div id="main" className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
        {children}
      </div>
    </div>
  );
}
