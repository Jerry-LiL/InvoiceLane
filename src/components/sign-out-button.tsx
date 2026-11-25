import { signOut } from '@/actions/auth';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-sm text-white/70 underline-offset-2 hover:text-white hover:underline">
        Sign out
      </button>
    </form>
  );
}
