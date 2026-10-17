import { mentionEmailSignature, type MentionEmail } from '../../../../convex/lib/plannerMentionEmail';

type Config = { secret?: string; apiKey?: string; fromEmail?: string };
const reply = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
const escape = (text: string) => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export async function handleMentionEmail(request: Request, config: Config) {
  if (!config.secret || config.secret.length < 32) return reply(503);
  if (Number(request.headers.get('content-length')) > 12_000) return reply(413);
  const body = await request.text();
  if (body.length > 12_000) return reply(413);
  const supplied = request.headers.get('X-Planner-Signature') || '';
  const expected = await mentionEmailSignature(config.secret, body);
  // Compare every character, with fixed-length validation before comparison.
  if (supplied.length !== expected.length) return reply(401);
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= supplied.charCodeAt(index) ^ expected.charCodeAt(index);
  if (difference) return reply(401);
  let message: MentionEmail;
  try {
    const parsed = JSON.parse(body);
    if (!Number.isFinite(parsed.timestamp) || Math.abs(Date.now() - parsed.timestamp) > 300_000) return reply(401);
    message = parsed.message;
    if (!message || Object.values(message).some(value => typeof value !== 'string') ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.recipientEmail) ||
      ![message.notificationId, message.itemId, message.commentId].every(value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value)) ||
      typeof message.author !== 'string' || message.author.length > 100 || typeof message.title !== 'string' || message.title.length > 200 ||
      typeof message.excerpt !== 'string' || message.excerpt.length > 300) return reply(422);
  } catch { return reply(422); }
  if (!config.apiKey || config.apiKey === '[SENSITIVE]' || !config.fromEmail || config.fromEmail === '[SENSITIVE]') return reply(503);
  const link = new URL('https://surreyaisociety.org/committee/planner');
  link.searchParams.set('item', message.itemId); link.searchParams.set('comment', message.commentId);
  const subject = `${message.author} mentioned you in the committee planner`.replace(/[\r\n]/g, ' ');
  const text = `${message.author} mentioned you on ${message.title}.\n\n${message.excerpt}\n\nOpen comment: ${link}\n\nSign in with your committee email to view or reply.\nYou can turn mention emails off in the planner's notification inbox.`;
  const html = `<div style="font:16px/1.6 Arial,sans-serif;max-width:560px;margin:auto;color:#1e1e24"><p style="color:#6650a0">Surrey AI Society · Committee planner</p><h2>${escape(message.author)} mentioned you</h2><p>On <strong>${escape(message.title)}</strong></p><blockquote style="margin:24px 0;padding:12px 20px;border-left:3px solid #7857b5;white-space:pre-wrap">${escape(message.excerpt)}</blockquote><p><a href="${escape(link.href)}" style="display:inline-block;background:#6240a1;color:white;padding:10px 18px;border-radius:8px;text-decoration:none">Open comment</a></p><p style="font-size:13px;color:#666">Sign in with your committee email to view or reply. You can turn mention emails off in the planner's notification inbox.</p></div>`;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `planner-mention/${message.notificationId}` },
      body: JSON.stringify({ from: config.fromEmail, to: [message.recipientEmail], subject, text, html }), signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) { const result = await response.json() as { id?: string }; return reply(result.id ? 204 : 502); }
    // Provider errors stay server-side; no private content or credentials in logs.
    return reply(response.status === 400 || response.status === 422 ? 422 : 502);
  } catch { return reply(502); }
}
