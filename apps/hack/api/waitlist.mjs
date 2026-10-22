import { get, head, put } from '@vercel/blob';
import { handleWaitlistRequest } from '../lib/waitlist.mjs';

const preview = process.env.VERCEL_ENV !== 'production';

const blobPut = ({ key, record, allowOverwrite = false }) => put(key, JSON.stringify(record), {
  access: 'private',
  addRandomSuffix: false,
  allowOverwrite,
  contentType: 'application/json',
});

async function sendNotification({ payload }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !payload?.from) throw Object.assign(new Error('email-not-configured'), { fatal: true });
  const bodyPayload = JSON.stringify({
    from: payload.from,
    to: payload.to,
    reply_to: payload.replyTo,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          'idempotency-key': payload.idempotencyKey,
        },
        body: bodyPayload,
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.id) return { id: body.id, status: 'accepted' };
      const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
      if (!retryable) throw Object.assign(new Error('email-provider-failed'), { fatal: true });
      if (attempt === 1) throw new Error('email-provider-failed');
    } catch (error) {
      if (error.fatal) throw error;
      if (attempt === 1) throw new Error('email-provider-failed');
    } finally {
      clearTimeout(timeout);
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('email-provider-failed');
}

export async function POST(request) {
  return handleWaitlistRequest(request, {
    preview,
    head,
    get: key => get(key, { access: 'private', useCache: false }),
    save: ({ key, record }) => blobPut({ key, record }),
    saveNotification: ({ key, record, allowOverwrite }) => blobPut({ key, record, allowOverwrite }),
    sendNotification,
  });
}

export async function GET() {
  return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
    status: 405,
    headers: { allow: 'POST', 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
