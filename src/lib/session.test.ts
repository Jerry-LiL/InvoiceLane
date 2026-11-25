import { afterEach, describe, expect, it } from 'vitest';
import { readSession, signSession } from './session';
import { safeNextPath } from './paths';

const originalSecret = process.env.SESSION_SECRET;

afterEach(() => {
  process.env.SESSION_SECRET = originalSecret;
});

describe('session cookie', () => {
  it('round-trips a signed payload', async () => {
    process.env.SESSION_SECRET = 'test-session-secret-value';
    const now = Date.parse('2026-04-02T12:00:00Z');
    const token = await signSession('user-1', now);
    await expect(readSession(token, now + 1000)).resolves.toMatchObject({ sub: 'user-1' });
  });

  it('rejects a tampered body, a bad signature, and an expired cookie', async () => {
    process.env.SESSION_SECRET = 'test-session-secret-value';
    const now = Date.parse('2026-04-02T12:00:00Z');
    const token = await signSession('user-1', now);
    const [, signature] = token.split('.');
    const forgedBody = btoa(JSON.stringify({ sub: 'user-2', exp: 9_999_999_999 }))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
    await expect(readSession(`${forgedBody}.${signature}`, now)).resolves.toBeNull();
    await expect(readSession(`${token.slice(0, -2)}aa`, now)).resolves.toBeNull();
    await expect(readSession(token, now + 15 * 24 * 60 * 60 * 1000)).resolves.toBeNull();
    await expect(readSession('not-a-token', now)).resolves.toBeNull();
  });

  it('refuses to sign when the secret is missing and ignores a cookie under the wrong secret', async () => {
    process.env.SESSION_SECRET = 'test-session-secret-value';
    const token = await signSession('user-1', Date.parse('2026-04-02T12:00:00Z'));
    process.env.SESSION_SECRET = 'a-different-session-secret';
    await expect(readSession(token)).resolves.toBeNull();
    delete process.env.SESSION_SECRET;
    await expect(signSession('user-1')).rejects.toThrow(/SESSION_SECRET/);
  });
});

describe('safeNextPath', () => {
  it('only returns dashboard paths', () => {
    expect(safeNextPath('/dashboard/invoices/1')).toBe('/dashboard/invoices/1');
    expect(safeNextPath('https://example.com')).toBe('/dashboard');
    expect(safeNextPath('//example.com')).toBe('/dashboard');
    expect(safeNextPath('/login')).toBe('/dashboard');
    expect(safeNextPath(undefined)).toBe('/dashboard');
  });
});
