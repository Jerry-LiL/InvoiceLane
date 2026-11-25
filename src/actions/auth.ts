'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import type { ActionState } from '@/lib/action-state';
import { clearSession, setSession } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/passwords';
import { safeNextPath } from '@/lib/paths';
import { loginSchema, signupSchema } from '@/lib/validators';

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? 'Check the form and try again.';
}

export async function signup(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing) return { error: 'An account with that email already exists.' };

  const [user] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    })
    .returning({ id: users.id });

  try {
    await setSession(user.id);
  } catch {
    return { error: 'The account was created, but sign-in is not configured. Set SESSION_SECRET and try again.' };
  }
  redirect('/dashboard');
}

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const [user] = await getDb().select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: 'Email or password is incorrect.' };
  }

  try {
    await setSession(user.id);
  } catch {
    return { error: 'Sign-in is not configured. Set SESSION_SECRET and try again.' };
  }
  redirect(safeNextPath(formData.get('next')));
}

export async function signOut(): Promise<void> {
  await clearSession();
  redirect('/');
}
