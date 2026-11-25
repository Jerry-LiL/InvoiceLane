import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './passwords';

describe('passwords', () => {
  it('verifies the password that was hashed and rejects a different one', async () => {
    const stored = await hashPassword('invoicelane-demo');
    expect(stored.startsWith('scrypt$')).toBe(true);
    await expect(verifyPassword('invoicelane-demo', stored)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', stored)).resolves.toBe(false);
    await expect(verifyPassword('invoicelane-demo', 'plaintext')).resolves.toBe(false);
  });
});
