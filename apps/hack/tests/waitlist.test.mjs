import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_VERSION,
  handleWaitlistRequest,
  notificationKey,
  notificationIdempotencyKey,
  resetBurstLimit,
  storageKey,
  WAITLIST_RECIPIENT,
} from '../lib/waitlist.mjs';

const origin = 'https://surrey-ai-hack-2027.vercel.app';
const makeRequest = (body, options = {}) => {
  const method = options.method || 'POST';
  const headers = {
    ...(options.omitOrigin ? {} : { origin: options.origin ?? origin }),
    'content-type': options.contentType || 'application/json',
    ...(options.headers || {}),
  };
  const init = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = options.stream ?? options.raw ?? JSON.stringify(body);
    if (options.stream) init.duplex = 'half';
  }
  return new Request(`${origin}/api/waitlist`, init);
};
const read = async response => ({ status: response.status, body: await response.json() });

test.beforeEach(() => resetBurstLimit());

test('stores a normalized, consented record and does not expose the email', async () => {
  const writes = [];
  const response = await handleWaitlistRequest(makeRequest({ email: '  Person@Example.COM ', consent: true, source: 'Participant' }), {
    now: () => Date.parse('2026-10-21T12:00:00.000Z'),
    save: async entry => writes.push(entry),
  });
  const result = await read(response);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { ok: true });
  assert.equal(writes[0].key, storageKey('person@example.com'));
  assert.deepEqual(writes[0].record, {
    email: 'person@example.com',
    createdAt: '2026-10-21T12:00:00.000Z',
    consent: true,
    consentVersion: CONSENT_VERSION,
    source: 'participant',
  });
});

test('rejects malformed, missing-consent and honeypot payloads', async t => {
  for (const body of [{ email: 'nope', consent: true }, { email: 'a@example.com', consent: false }, { email: 'a@example.com', consent: true, company: 'bot' }]) {
    await t.test(JSON.stringify(body), async () => {
      const result = await read(await handleWaitlistRequest(makeRequest(body), { save: async () => assert.fail('must not save') }));
      assert.equal(result.status, 400);
      assert.equal(result.body.ok, undefined);
    });
  }
  const malformed = await read(await handleWaitlistRequest(makeRequest(null, { raw: '{"email":' }), { save: async () => assert.fail('must not save') }));
  assert.equal(malformed.status, 400);
});

test('rejects wrong method, origin, content type and oversized bodies', async () => {
  const method = await read(await handleWaitlistRequest(makeRequest({}, { method: 'GET' }), { save: async () => {} }));
  assert.equal(method.status, 405);
  assert.equal(method.body.error, 'Method not allowed.');
  assert.equal((await read(await handleWaitlistRequest(makeRequest({ email: 'a@example.com', consent: true }, { origin: 'https://example.com' }), { save: async () => {} }))).status, 403);
  assert.equal((await read(await handleWaitlistRequest(makeRequest({ email: 'a@example.com', consent: true }, { omitOrigin: true }), { save: async () => {} }))).status, 403);
  assert.equal((await read(await handleWaitlistRequest(makeRequest({}, { contentType: 'text/plain' }), { save: async () => {} }))).status, 415);
  const declaredOversized = await read(await handleWaitlistRequest(makeRequest({}, { raw: '{}', headers: { 'content-length': '2049' } }), { save: async () => assert.fail('must not save') }));
  assert.equal(declaredOversized.status, 413);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(1024));
      controller.enqueue(new Uint8Array(1025));
      controller.close();
    },
  });
  const streamedOversized = await read(await handleWaitlistRequest(makeRequest(null, { stream }), { save: async () => assert.fail('must not save') }));
  assert.equal(streamedOversized.status, 413);
});

test('a failed put is idempotent only when private head confirms the exact key', async () => {
  let inspectedKey;
  const response = await handleWaitlistRequest(makeRequest({ email: 'same@example.com', consent: true }), {
    save: async () => { throw new Error('SDK duplicate error'); },
    head: async key => {
      inspectedKey = key;
      return { pathname: key };
    },
  });
  assert.deepEqual(await read(response), { status: 200, body: { ok: true } });
  assert.equal(inspectedKey, storageKey('same@example.com'));
});

test('head failures and mismatched paths keep storage errors retryable', async t => {
  await t.test('head unavailable', async () => {
    const response = await handleWaitlistRequest(makeRequest({ email: 'same@example.com', consent: true }), {
      save: async () => { throw new Error('SDK duplicate error'); },
      head: async () => { throw new Error('head unavailable'); },
    });
    assert.equal(response.status, 503);
  });
  await t.test('head returns another pathname', async () => {
    const response = await handleWaitlistRequest(makeRequest({ email: 'same@example.com', consent: true }), {
      save: async () => { throw new Error('SDK duplicate error'); },
      head: async () => ({ pathname: 'waitlist/another-key.json' }),
    });
    assert.equal(response.status, 503);
  });
});

test('storage failures are retryable and do not leak details', async () => {
  const response = await handleWaitlistRequest(makeRequest({ email: 'same@example.com', consent: true }), {
    save: async () => { throw new Error('token should not be returned'); },
  });
  const result = await read(response);
  assert.equal(result.status, 503);
  assert.equal(result.body.error.includes('token'), false);
  assert.equal(response.headers.get('retry-after'), '5');
});

test('rate limits bursts and recovers after the window', async () => {
  let timestamp = Date.parse('2026-10-21T12:00:00.000Z');
  const options = { headers: { 'x-forwarded-for': '203.0.113.5' } };
  for (let index = 0; index < 8; index += 1) {
    const response = await handleWaitlistRequest(makeRequest({ email: `person${index}@example.com`, consent: true }, options), {
      now: () => timestamp,
      save: async () => {},
    });
    assert.equal(response.status, 200);
  }
  const limited = await handleWaitlistRequest(makeRequest({ email: 'person8@example.com', consent: true }, options), {
    now: () => timestamp,
    save: async () => assert.fail('must not save while rate limited'),
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  timestamp += 60_000;
  const recovered = await handleWaitlistRequest(makeRequest({ email: 'person9@example.com', consent: true }, options), {
    now: () => timestamp,
    save: async () => {},
  });
  assert.equal(recovered.status, 200);
});

test('rejects long and newline-containing emails before saving', async t => {
  for (const email of [`${'a'.repeat(250)}@example.com`, 'person\n@example.com']) {
    await t.test(JSON.stringify(email), async () => {
      const response = await handleWaitlistRequest(makeRequest({ email, consent: true }), { save: async () => assert.fail('must not save') });
      assert.equal(response.status, 400);
    });
  }
});

test('preview records use a separate prefix', async () => {
  let saved;
  await handleWaitlistRequest(makeRequest({ email: 'preview@example.com', consent: true }), { preview: true, save: async entry => { saved = entry; } });
  assert.match(saved.key, /^preview-waitlist\/[a-f0-9]{64}\.json$/);
});

test('production signup sends one fixed-recipient notification and stores a receipt', async () => {
  let sent;
  const blobs = new Map();
  const response = await handleWaitlistRequest(makeRequest({ email: 'notify@example.com', consent: true }), {
    save: async ({ key, record }) => blobs.set(key, record),
    saveNotification: async ({ key, record }) => blobs.set(key, record),
    sendNotification: async ({ payload }) => { sent = payload; return { id: 'email_123', status: 'accepted' }; },
    notificationFrom: 'Surrey AI Society <applications@surreyaisociety.org>',
    get: async key => blobs.has(key) ? { text: async () => JSON.stringify(blobs.get(key)) } : null,
    preview: false,
    now: () => Date.parse('2026-10-21T12:00:00.000Z'),
  });
  assert.equal(response.status, 200);
  assert.equal(sent.to[0], WAITLIST_RECIPIENT);
  assert.equal(sent.replyTo[0], 'notify@example.com');
  assert.equal(sent.subject, 'New Surrey AI Hack 2027 waitlist signup');
  assert.equal(blobs.get(notificationKey('notify@example.com')).status, 'sent');
  assert.equal(blobs.get(notificationKey('notify@example.com')).providerId, 'email_123');
});

test('repeat signup uses the saved receipt and does not send a second notification', async () => {
  const blobs = new Map();
  let sends = 0;
  const options = {
    save: async ({ key, record }) => {
      if (blobs.has(key)) throw new Error('duplicate');
      blobs.set(key, record);
    },
    head: async key => blobs.has(key) ? { pathname: key } : null,
    saveNotification: async ({ key, record, allowOverwrite }) => {
      if (!allowOverwrite && blobs.has(key)) throw new Error('duplicate');
      blobs.set(key, record);
    },
    get: async key => blobs.has(key) ? { text: async () => JSON.stringify(blobs.get(key)) } : null,
    sendNotification: async () => { sends += 1; return { id: `email_${sends}`, status: 'accepted' }; },
    notificationFrom: 'Surrey AI Society <applications@surreyaisociety.org>',
  };
  assert.equal((await handleWaitlistRequest(makeRequest({ email: 'repeat@example.com', consent: true }), options)).status, 200);
  assert.equal((await handleWaitlistRequest(makeRequest({ email: 'repeat@example.com', consent: true }), options)).status, 200);
  assert.equal(sends, 1);
});

test('notification payload keeps the original signup timestamp on a retry', async () => {
  const blobs = new Map([[storageKey('frozen@example.com'), {
    email: 'frozen@example.com', createdAt: '2026-10-21T12:00:00.000Z', consent: true, consentVersion: CONSENT_VERSION, source: 'website',
  }]]);
  let payload;
  const response = await handleWaitlistRequest(makeRequest({ email: 'frozen@example.com', consent: true }), {
    save: async () => { throw new Error('duplicate'); },
    head: async key => ({ pathname: key }),
    get: async key => blobs.has(key) ? { text: async () => JSON.stringify(blobs.get(key)) } : null,
    saveNotification: async () => {},
    notificationFrom: 'Surrey AI Society <applications@surreyaisociety.org>',
    sendNotification: async ({ payload: next }) => { payload = next; return { id: 'email_frozen' }; },
  });
  assert.equal(response.status, 200);
  assert.match(payload.text, /2026-10-21T12:00:00\.000Z/);
});

test('preview signup never calls the notification provider', async () => {
  let sends = 0;
  const response = await handleWaitlistRequest(makeRequest({ email: 'preview-notify@example.com', consent: true }), {
    preview: true,
    save: async () => {},
    sendNotification: async () => { sends += 1; },
  });
  assert.equal(response.status, 200);
  assert.equal(sends, 0);
});

test('notification provider failure preserves signup and returns a retryable response', async () => {
  let signupSaved = false;
  const response = await handleWaitlistRequest(makeRequest({ email: 'provider-down@example.com', consent: true }), {
    save: async () => { signupSaved = true; },
    sendNotification: async () => { throw new Error('provider unavailable'); },
  });
  assert.equal(signupSaved, true);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '15');
});

test('receipt write failure returns retryable status after provider acceptance', async () => {
  let sends = 0;
  const response = await handleWaitlistRequest(makeRequest({ email: 'receipt-failure@example.com', consent: true }), {
    save: async () => {},
    get: async () => null,
    saveNotification: async ({ allowOverwrite }) => { if (allowOverwrite) throw new Error('blob unavailable'); },
    notificationFrom: 'Surrey AI Society <applications@surreyaisociety.org>',
    sendNotification: async () => { sends += 1; return { id: 'email_receipt_failure' }; },
  });
  assert.equal(response.status, 503);
  assert.equal(sends, 1);
});

test('a concurrent pending receipt is recovered and its frozen payload is sent', async () => {
  const email = 'pending@example.com';
  const signup = { email, createdAt: '2026-10-21T12:00:00.000Z', consent: true, consentVersion: CONSENT_VERSION, source: 'website' };
  const frozenKey = notificationIdempotencyKey(email);
  const pending = { status: 'pending', pendingAt: '2026-10-21T12:05:00.000Z', idempotencyKey: frozenKey, payload: { from: 'Surrey AI Society <applications@surreyaisociety.org>', to: [WAITLIST_RECIPIENT], replyTo: [email], subject: 'Frozen subject', text: 'Frozen body', html: '<p>Frozen</p>', idempotencyKey: frozenKey } };
  const blobs = new Map([[storageKey(email), signup]]);
  let sent;
  const now = Date.parse('2026-10-21T12:10:00.000Z');
  const response = await handleWaitlistRequest(makeRequest({ email, consent: true }), {
    save: async () => { throw new Error('duplicate signup'); },
    head: async key => ({ pathname: key }),
    get: async key => key === notificationKey(email) ? { text: async () => JSON.stringify(pending) } : { text: async () => JSON.stringify(blobs.get(key)) },
    saveNotification: async () => {},
    sendNotification: async ({ payload }) => { sent = payload; return { id: 'email_pending' }; },
    notificationFrom: 'Surrey AI Society <applications@surreyaisociety.org>',
    now: () => now,
  });
  assert.equal(response.status, 200);
  assert.equal(sent.subject, 'Frozen subject');
  assert.equal(sent.text, 'Frozen body');
});

test('receipt read failure fails closed without sending', async () => {
  let sends = 0;
  const response = await handleWaitlistRequest(makeRequest({ email: 'receipt-read-failure@example.com', consent: true }), {
    save: async () => {},
    get: async () => { throw new Error('blob unavailable'); },
    sendNotification: async () => { sends += 1; },
    notificationFrom: 'Surrey AI Society <applications@surreyaisociety.org>',
  });
  assert.equal(response.status, 503);
  assert.equal(sends, 0);
});

test('pending notifications older than 23 hours remain retryable without sending', async () => {
  let sends = 0;
  const email = 'old-pending@example.com';
  const response = await handleWaitlistRequest(makeRequest({ email, consent: true }), {
    save: async () => {},
    get: async key => key === notificationKey(email) ? { text: async () => JSON.stringify({ status: 'pending', pendingAt: '2026-10-20T00:00:00.000Z', payload: { idempotencyKey: 'old', to: [WAITLIST_RECIPIENT] } }) } : null,
    sendNotification: async () => { sends += 1; },
    notificationFrom: 'Surrey AI Society <applications@surreyaisociety.org>',
    now: () => Date.parse('2026-10-21T12:00:00.000Z'),
  });
  assert.equal(response.status, 503);
  assert.equal(sends, 0);
});
