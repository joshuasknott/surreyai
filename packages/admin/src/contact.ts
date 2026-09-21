import { getSocietyById } from './config';

type DeliveryConfig = { apiKey?: string; fromEmail?: string };
const recentAttempts = new Map<string, { count: number; until: number }>();
const MAX_BYTES = 20_000;
const reply = (status: number, message: string) => new Response(JSON.stringify({ message }), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export async function handleContactRequest(request: Request, societyKey: string, config: DeliveryConfig, clientAddress: string): Promise<Response> {
  const society = getSocietyById(societyKey);
  if (!society) return reply(404, 'Society not found.');
  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin) return reply(403, 'Please use the contact form on our website.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, 'Please use the contact form or email us directly.');

  let value: unknown;
  const reader = request.body?.getReader();
  if (!reader) return reply(400, 'Please complete the form.');
  try {
    let total = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      total += chunk.byteLength;
      if (total > MAX_BYTES) { await reader.cancel(); return reply(413, 'Your message is too long.'); }
      chunks.push(chunk);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return reply(400, 'Please complete the form.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return reply(400, 'Please complete the form.');
  const fields = value as Record<string, unknown>;
  if (fields.website) return reply(400, 'Please leave the website field empty.');
  const name = typeof fields.name === 'string' ? fields.name.trim() : '';
  const email = typeof fields.email === 'string' ? fields.email.trim() : '';
  const message = typeof fields.message === 'string' ? fields.message.trim() : '';
  if (!name || name.length > 100 || /[\r\n\x00-\x1f]/.test(name) ||
      email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      message.length < 10 || message.length > 4000) {
    return reply(400, 'Please enter your name, a valid email, and a message of 10–4,000 characters.');
  }
  if (!config.apiKey || !config.fromEmail) return reply(503, 'Please send your message using your email app.');

  // A bounded, short-lived per-instance throttle; no contact contents are stored.
  const now = Date.now();
  for (const [key, entry] of recentAttempts) if (entry.until <= now) recentAttempts.delete(key);
  const key = `${societyKey}:${clientAddress}`;
  const entry = recentAttempts.get(key);
  if (entry && entry.count >= 3) return reply(429, 'Please wait a few minutes before sending another message.');
  if (!entry && recentAttempts.size >= 1000) return reply(429, 'Please try again shortly.');
  recentAttempts.set(key, { count: (entry?.count ?? 0) + 1, until: entry?.until ?? now + 10 * 60_000 });
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.fromEmail,
        to: [society.contactEmail],
        reply_to: email,
        subject: `Website enquiry for ${society.shortName}`,
        text: `From: ${name}\nEmail: ${email}\n\n${message}`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json() as { id?: unknown };
    if (!response.ok || typeof result.id !== 'string' || !result.id) return reply(502, 'We could not confirm delivery. Please use email instead.');
    return reply(200, 'Your message has been sent to the committee.');
  } catch { return reply(502, 'We could not confirm delivery. Please use email instead.'); }
}
