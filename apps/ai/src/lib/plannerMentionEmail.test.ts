import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleMentionEmail } from './plannerMentionEmail';
import { mentionEmailSignature } from '../../../../convex/lib/plannerMentionEmail';

const secret = 'local-test-only-secret-for-mention-email';
const config = { secret, apiKey: 'local-test-key', fromEmail: 'AI Planner <planner@example.test>' };
const message = { notificationId: 'notification-1', recipientEmail: 'committee@example.test', author: '<Joshua>', title: 'Welcome & workshop', excerpt: '<script>private excerpt</script>', itemId: 'item-1', commentId: 'comment-1' };
async function request(timestamp = Date.now(), signature = true) {
  const body = JSON.stringify({ timestamp, message });
  return new Request('https://example.test/api/planner-mention-email', { method: 'POST', body, headers: { 'X-Planner-Signature': signature ? await mentionEmailSignature(secret, body) : 'invalid' } });
}
afterEach(() => vi.unstubAllGlobals());

describe('signed planner email relay', () => {
  it('rejects forged, stale and tampered requests before contacting the provider', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect((await handleMentionEmail(await request(Date.now(), false), config)).status).toBe(401);
    expect((await handleMentionEmail(await request(Date.now() - 360_000), config)).status).toBe(401);
    const original = await request(); const body = (await original.text()).replace('committee@example.test', 'attacker@example.test');
    expect((await handleMentionEmail(new Request(original.url, { method: 'POST', body, headers: original.headers }), config)).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('sends only to the signed recipient with an escaped preview and exact comment link', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'email-1' }), { status: 200 })); vi.stubGlobal('fetch', fetchMock);
    expect((await handleMentionEmail(await request(), config)).status).toBe(204);
    const [url, options] = fetchMock.mock.calls[0]; const body = JSON.parse(options.body);
    expect(url).toBe('https://api.resend.com/emails'); expect(body.to).toEqual(['committee@example.test']);
    expect(body.html).not.toContain('<script>'); expect(body.html).toContain('&lt;Joshua&gt;');
    expect(body.text).toContain('/committee/planner?item=item-1&comment=comment-1');
    expect(options.headers['Idempotency-Key']).toBe('planner-mention/notification-1');
  });
  it('retries unavailable configuration, provider outages and ambiguous acceptance', async () => {
    expect((await handleMentionEmail(await request(), { ...config, apiKey: '[SENSITIVE]' })).status).toBe(503);
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 429 })).mockResolvedValueOnce(new Response('{}', { status: 200 })).mockRejectedValueOnce(new Error('timeout'));
    vi.stubGlobal('fetch', fetchMock);
    for (let i = 0; i < 3; i++) expect((await handleMentionEmail(await request(), config)).status).toBe(502);
  });
});
