import Link from 'next/link';
import { redirect } from 'next/navigation';
import { login } from '@/actions/auth';
import { AuthForm } from '@/components/auth-form';
import { getCurrentUser } from '@/lib/auth';
import { safeNextPath } from '@/lib/paths';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');
  const nextPath = safeNextPath((await searchParams).next);

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="font-serif text-2xl">
        InvoiceLane
      </Link>
      <h1 className="mt-8 font-serif text-3xl">Sign in</h1>
      <p className="mt-2 text-sm text-muted">Use the account you created, or the seeded demo user.</p>
      <div className="mt-6">
        <AuthForm
          action={login}
          submitLabel="Sign in"
          hidden={[{ name: 'next', value: nextPath }]}
          fields={[
            { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
            { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
          ]}
        />
      </div>
      <p className="mt-6 text-sm text-muted">
        New here?{' '}
        <Link href="/signup" className="text-pine underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
