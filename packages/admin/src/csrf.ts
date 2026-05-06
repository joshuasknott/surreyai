import { createHmac, randomBytes } from 'node:crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || randomBytes(32).toString('hex');
const TOKEN_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Generates a CSRF token bound to a session identifier.
 * The token encodes a timestamp so it can be verified statelessly.
 */
export function generateCsrfToken(sessionId: string): string {
  const timestamp = Date.now().toString(36);
  const payload = `${sessionId}:${timestamp}`;
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');
  return `${payload}:${signature}`;
}

/**
 * Verifies a CSRF token against the expected session identifier.
 * Returns true only if the token is well-formed, the signature matches,
 * and the token has not expired.
 */
export function verifyCsrfToken(token: string | undefined | null, sessionId: string): boolean {
  if (!token) return false;

  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [storedSessionId, timestamp, signature] = parts;
  if (storedSessionId !== sessionId) return false;

  // Check expiry
  const tokenTime = parseInt(timestamp, 36);
  if (isNaN(tokenTime) || Date.now() - tokenTime > TOKEN_EXPIRY_MS) return false;

  // Verify signature
  const expectedPayload = `${storedSessionId}:${timestamp}`;
  const expectedSignature = createHmac('sha256', CSRF_SECRET)
    .update(expectedPayload)
    .digest('hex');

  // Timing-safe comparison
  if (signature.length !== expectedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}
