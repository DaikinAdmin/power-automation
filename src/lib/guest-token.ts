/**
 * Short-lived HMAC-SHA256 tokens for guest order access.
 *
 * Token format: `${expiryTimestamp}.${base64urlSignature}`
 * The HMAC is over the string `${orderId}:${expiryTimestamp}`, signed with
 * BETTER_AUTH_SECRET. This binds the token tightly to a specific orderId and
 * makes it impossible to forge without knowing the secret.
 *
 * Default TTL: 24 hours (enough to complete a payment session).
 */

const EXPIRES_IN_MS = 24 * 60 * 60 * 1000;

async function getKey(usage: KeyUsage): Promise<CryptoKey> {
  const secret = process.env.BETTER_AUTH_SECRET ?? '';
  const algorithm = { name: 'HMAC', hash: 'SHA-256' } as const;
  const keyData = new TextEncoder().encode(secret);
  return crypto.subtle.importKey('raw', keyData, algorithm, false, [usage]);
}

function toBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function generateGuestToken(orderId: string): Promise<string> {
  const expiry = Date.now() + EXPIRES_IN_MS;
  const message = `${orderId}:${expiry}`;
  const key = await getKey('sign');
  const raw = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return `${expiry}.${toBase64Url(raw)}`;
}

export async function verifyGuestToken(orderId: string, token: string): Promise<boolean> {
  try {
    const dotIdx = token.indexOf('.');
    if (dotIdx < 1) return false;
    const expiry = parseInt(token.slice(0, dotIdx), 10);
    if (isNaN(expiry) || Date.now() > expiry) return false;
    const sig = token.slice(dotIdx + 1);
    const message = `${orderId}:${expiry}`;
    const key = await getKey('verify');
    const sigBuf = fromBase64Url(sig).buffer as ArrayBuffer;
    return await crypto.subtle.verify('HMAC', key, sigBuf, new TextEncoder().encode(message));
  } catch {
    return false;
  }
}
