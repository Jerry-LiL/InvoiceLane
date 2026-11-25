import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signup } from '@/actions/auth';
import { AuthForm } from '@/components/auth-form';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Create account' };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="font-serif text-2xl">
        InvoiceLane
      </Link>
      <h1 className="mt-8 font-serif text-3xl">Create an account</h1>
      <p className="mt-2 text-sm text-muted">Your clients and invoices stay on this account.</p>
      <div className="mt-6">
        <AuthForm
          action={signup}
          submitLabel="Create account"
          fields={[
            { name: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
            { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
            { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', minLength: 8 },
          ]}
        />
      </div>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-pine underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
