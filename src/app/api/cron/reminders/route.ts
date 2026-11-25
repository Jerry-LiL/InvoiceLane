import { NextResponse } from 'next/server';
import { runReminderSweep } from '@/jobs/run-reminders';
import { safeEqual } from '@/lib/secret';

export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!token) return false;
  return safeEqual(token, expected);
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runReminderSweep();
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
