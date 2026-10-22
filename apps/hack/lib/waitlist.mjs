import { createHash } from 'node:crypto';

export const MAX_BODY_BYTES = 2048;
export const MAX_EMAIL_LENGTH = 254;
export const CONSENT_VERSION = '2026-10-21';
export const PRODUCTION_ORIGIN = 'https://surrey-ai-hack-2027.vercel.app';
export const PROJECT_ORIGIN = 'https://surrey-ai-hack-2027-joshuaknotts-projects.vercel.app';
export const WAITLIST_RECIPIENT = 'ussu.aianddatascience@surrey.ac.uk';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BURST = 8;
const MAX_BURST_KEYS = 1000;
const BURST_WINDOW_MS = 60_000;
const bursts = new Map();

const json = (body, status = 200, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  },
});

function originAllowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const requestOrigin = new URL(request.url).origin;
    return origin === requestOrigin || origin === PRODUCTION_ORIGIN || origin === PROJECT_ORIGIN;
  } catch {
    return false;
  }
}

async function readBody(request) {
  if (!request.body?.getReader) {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new Error('body-too-large');
    return text;
  }
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error('body-too-large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  const data = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(data);
}

function rateKey(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'anonymous';
}

function allowedBurst(request, now) {
  const key = rateKey(request);
  const existing = bursts.get(key);
  if (!existing || now - existing.startedAt >= BURST_WINDOW_MS) {
    for (const [candidate, entry] of bursts) {
      if (now - entry.startedAt >= BURST_WINDOW_MS) bursts.delete(candidate);
    }
    while (bursts.size >= MAX_BURST_KEYS) {
      const oldest = bursts.keys().next().value;
      if (oldest === undefined) break;
      bursts.delete(oldest);
    }
    bursts.set(key, { startedAt: now, count: 1 });
    return true;
  }
  existing.count += 1;
  return existing.count <= MAX_BURST;
}

export function resetBurstLimit() {
  bursts.clear();
}

export function normalizePayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Send a JSON object.' };
  if (typeof input.company !== 'undefined' && (typeof input.company !== 'string' || input.company.trim() !== '')) {
    return { error: 'Invalid request.' };
  }
  if (input.consent !== true) return { error: 'Consent is required.' };
  if (typeof input.email !== 'string') return { error: 'Enter a valid email address.' };
  const email = input.email.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.' };
  }
  const source = typeof input.source === 'string' && input.source.length <= 48
    ? input.source.trim().toLowerCase() || 'website'
    : 'website';
  if (!/^[a-z0-9._-]+$/.test(source)) return { error: 'Invalid request.' };
  return { value: { email, source } };
}

export function storageKey(email, preview = false) {
  const digest = createHash('sha256').update(email).digest('hex');
  return `${preview ? 'preview-waitlist' : 'waitlist'}/${digest}.json`;
}

export function notificationKey(email, preview = false) {
  const digest = createHash('sha256').update(email).digest('hex');
  return `${preview ? 'preview-' : ''}waitlist-notifications/${digest}.json`;
}

export function notificationIdempotencyKey(email, preview = false) {
  return `surrey-ai-hack-2027/${preview ? 'preview/' : ''}${createHash('sha256').update(email).digest('hex')}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function createNotificationPayload(record, { from, preview = false } = {}) {
  const email = record.email;
  const subject = `New Surrey AI Hack 2027 waitlist signup${preview ? ' (preview)' : ''}`;
  const text = [
    'A new Surrey AI Hack 2027 waitlist signup was saved.',
    '',
    `Email: ${email}`,
    `Signed up at: ${record.createdAt}`,
    `Source: ${record.source}`,
  ].join('\n');
  return {
    from,
    to: [WAITLIST_RECIPIENT],
    replyTo: [email],
    subject,
    text,
    html: `<p>A new Surrey AI Hack 2027 waitlist signup was saved.</p><dl><dt>Email</dt><dd>${escapeHtml(email)}</dd><dt>Signed up at</dt><dd>${escapeHtml(record.createdAt)}</dd><dt>Source</dt><dd>${escapeHtml(record.source)}</dd></dl>`,
    idempotencyKey: notificationIdempotencyKey(email, preview),
  };
}

async function readJson(get, key) {
  if (typeof get !== 'function') return { state: 'unavailable' };
  try {
    const result = await get(key);
    if (!result) return { state: 'missing' };
    const text = typeof result.text === 'function'
      ? await result.text()
      : result.stream?.getReader ? await new Response(result.stream).text()
      : typeof result.body === 'string' ? result.body : typeof result === 'string' ? result : null;
    return text ? { state: 'ok', value: JSON.parse(text) } : { state: 'error' };
  } catch {
    return { state: 'error' };
  }
}

const PENDING_MAX_AGE_MS = 23 * 60 * 60 * 1000;

async function notifyWaitlist({ record, created, preview, get, saveNotification, sendNotification, from, now }) {
  if (preview || typeof sendNotification !== 'function') return { ok: true, skipped: true };
  if (typeof saveNotification !== 'function') return { ok: false, error: 'notification-receipt-unavailable' };
  const key = notificationKey(record.email, preview);
  const receipt = await readJson(get, key);
  if (receipt.state === 'error' || receipt.state === 'unavailable') return { ok: false, error: 'notification-receipt-unavailable' };
  let existing = receipt.state === 'ok' ? receipt.value : null;
  if (existing?.status === 'sent' && existing.idempotencyKey === notificationIdempotencyKey(record.email, preview)) {
    return { ok: true, alreadySent: true };
  }
  if (existing?.status === 'sent') return { ok: false, error: 'notification-receipt-invalid' };
  if (existing?.status === 'pending') {
    const pendingAt = Date.parse(existing.pendingAt || '');
    if (!Number.isFinite(pendingAt) || now() - pendingAt > PENDING_MAX_AGE_MS) return { ok: false, error: 'notification-pending-too-old' };
    if (existing.idempotencyKey !== notificationIdempotencyKey(record.email, preview) || existing.payload?.to?.[0] !== WAITLIST_RECIPIENT) return { ok: false, error: 'notification-receipt-invalid' };
  }
  const originalRead = created ? { state: 'ok', value: record } : await readJson(get, storageKey(record.email, preview));
  if (originalRead.state === 'error' || originalRead.state === 'unavailable') return { ok: false, error: 'signup-unavailable' };
  const originalRecord = originalRead.state === 'ok' ? originalRead.value : record;
  let payload = existing?.payload || createNotificationPayload(originalRecord, { from: from || process.env.WAITLIST_FROM_EMAIL || process.env.COMMITTEE_FROM_EMAIL, preview });
  if (!payload.from || payload.to?.[0] !== WAITLIST_RECIPIENT) return { ok: false, error: 'email-not-configured' };
  if (typeof saveNotification === 'function' && !existing) {
    try {
      await saveNotification({ key, record: { status: 'pending', payload, idempotencyKey: payload.idempotencyKey, createdAt: record.createdAt, pendingAt: new Date(now()).toISOString() }, allowOverwrite: false });
    } catch {
      const recoveredRead = await readJson(get, key);
      if (recoveredRead.state === 'error' || recoveredRead.state === 'unavailable') return { ok: false, error: 'notification-receipt-unavailable' };
      const recovered = recoveredRead.state === 'ok' ? recoveredRead.value : null;
      if (!recovered) return { ok: false, error: 'notification-receipt-missing' };
      if (recovered.status === 'sent') return { ok: true, alreadySent: true };
      if (recovered.status === 'pending') {
        const pendingAt = Date.parse(recovered.pendingAt || '');
        if (!Number.isFinite(pendingAt) || now() - pendingAt > PENDING_MAX_AGE_MS) return { ok: false, error: 'notification-pending-too-old' };
        if (recovered.idempotencyKey !== notificationIdempotencyKey(record.email, preview) || recovered.payload?.to?.[0] !== WAITLIST_RECIPIENT) return { ok: false, error: 'notification-receipt-invalid' };
        existing = recovered;
        payload = recovered.payload;
      } else return { ok: false, error: 'notification-receipt-invalid' };
    }
  }
  let delivery;
  try {
    delivery = await sendNotification({ payload });
  } catch {
    return { ok: false, error: 'email-provider-failed' };
  }
  if (typeof saveNotification === 'function') {
    try {
      await saveNotification({ key, record: { status: 'sent', payload, idempotencyKey: payload.idempotencyKey, providerId: delivery?.id || null, providerStatus: delivery?.status || 'accepted', sentAt: new Date().toISOString() }, allowOverwrite: true });
    } catch {
      return { ok: false, error: 'email-receipt-failed' };
    }
  }
  return { ok: true, providerId: delivery?.id || null };
}

async function confirmsExistingObject(head, key) {
  if (typeof head !== 'function') return false;
  try {
    const existing = await head(key);
    return existing?.pathname === key;
  } catch {
    return false;
  }
}

async function saveOrConfirmExisting({ save, head, key, record }) {
  try {
    await save({ key, record });
    return { created: true };
  } catch (error) {
    if (await confirmsExistingObject(head, key)) return { created: false };
    throw error;
  }
}

export async function handleWaitlistRequest(request, { save, head, get, saveNotification, sendNotification, notificationFrom, now = () => Date.now(), preview = false, limit = allowedBurst } = {}) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
  if (!originAllowed(request)) return json({ error: 'Origin not allowed.' }, 403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
    return json({ error: 'Content type must be application/json.' }, 415);
  }
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: 'Request is too large.' }, 413);
  }
  const timestamp = now();
  if (!limit(request, timestamp)) return json({ error: 'Please try again shortly.' }, 429, { 'retry-after': '60' });
  let payload;
  try {
    payload = JSON.parse(await readBody(request));
  } catch (error) {
    return json({ error: error?.message === 'body-too-large' ? 'Request is too large.' : 'Send valid JSON.' }, error?.message === 'body-too-large' ? 413 : 400);
  }
  const normalized = normalizePayload(payload);
  if (normalized.error) return json({ error: normalized.error }, 400);
  if (typeof save !== 'function') return json({ error: 'Signup is temporarily unavailable.' }, 503, { 'retry-after': '5' });
  const record = {
    email: normalized.value.email,
    createdAt: new Date(timestamp).toISOString(),
    consent: true,
    consentVersion: CONSENT_VERSION,
    source: normalized.value.source,
  };
  const key = storageKey(record.email, preview);
  let persisted;
  try {
    persisted = await saveOrConfirmExisting({ save, head, key, record });
  } catch {
    return json({ error: 'Signup is temporarily unavailable. Please try again.' }, 503, { 'retry-after': '5' });
  }
  if (!preview && typeof sendNotification === 'function') {
    const notification = await notifyWaitlist({ record, created: persisted.created, preview, get, saveNotification, sendNotification, from: notificationFrom, now });
    if (!notification.ok) return json({ error: 'Your interest was saved, but the notification could not be delivered yet. Please try again.', saved: true, notificationPending: true }, 503, { 'retry-after': '15' });
    if (notification.providerId) console.info(JSON.stringify({ event: 'waitlist_notification_accepted', providerId: notification.providerId }));
  }
  return json({ ok: true });
}
