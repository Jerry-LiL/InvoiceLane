export const SESSION_COOKIE = 'invoicelane_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type SessionPayload = {
  sub: string;
  exp: number;
};

type CookieOptions = {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge: number;
};

function secret(): string | null {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) return null;
  return value;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function hmacKey(value: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(value), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export function sessionCookie(maxAge = SESSION_MAX_AGE_SECONDS): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export async function signSession(userId: string, now = Date.now()): Promise<string> {
  const keyMaterial = secret();
  if (!keyMaterial) {
    throw new Error('SESSION_SECRET must be set to at least 16 characters.');
  }
  const payload: SessionPayload = {
    sub: userId,
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(keyMaterial), new TextEncoder().encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function readSession(token: string, now = Date.now()): Promise<SessionPayload | null> {
  const keyMaterial = secret();
  if (!keyMaterial) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;

  let signatureBytes: Uint8Array<ArrayBuffer>;
  try {
    const decoded = base64UrlToBytes(signature);
    signatureBytes = new Uint8Array(decoded.byteLength);
    signatureBytes.set(decoded);
  } catch {
    return null;
  }

  const bodyBytes = new TextEncoder().encode(body);
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(keyMaterial), signatureBytes, bodyBytes);
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as Partial<SessionPayload>;
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
    if (typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 <= now) return null;
    return { sub: payload.sub, exp: payload.exp };
  } catch {
    return null;
  }
}
