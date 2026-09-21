import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleContactRequest } from './contact';
const valid = { name: 'Test Visitor', email: 'visitor@example.test', message: 'A question about joining the society.', website: '' };
const config = { apiKey: 'test-key', fromEmail: 'Society <contact@example.test>' };
let address = 0;
function request(body: unknown = valid, origin = 'https://surreyaisociety.org') {
  return new Request('https://surreyaisociety.org/api/contact', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
const send = (req = request(), options: { apiKey?: string; fromEmail?: string } = config, ip = String(++address)) => handleContactRequest(req, 'ai', options, ip);
afterEach(() => vi.unstubAllGlobals());
describe('society contact delivery', () => {
  it('only sends to the configured society inbox, with the visitor as reply-to', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'message-id' })));
    vi.stubGlobal('fetch', fetch);
    expect((await send(request({ ...valid, to: 'untrusted@example.test', message: '<script>text only</script>' }))).status).toBe(200);
    const payload = JSON.parse(fetch.mock.calls[0][1].body);
    expect(payload.to).toEqual(['ussu.aianddatascience@surrey.ac.uk']);
    expect(payload.reply_to).toBe(valid.email);
    expect(payload.text).toContain('<script>text only</script>');
    expect(payload.html).toBeUndefined();
  });
  it('rejects cross-origin submissions without contacting the provider', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await send(request(valid, 'https://untrusted.example'))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { ...valid, email: 'bad\r\nBcc:other@example.test' },
    { ...valid, name: 'name\nheader' },
    { ...valid, message: 'short' },
    { ...valid, website: 'spam' },
    { ...valid, name: 'x'.repeat(101) },
  ])('rejects invalid fields', async body => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await send(request(body))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('bounds the request body', async () => {
    expect((await send(request({ ...valid, message: 'x'.repeat(20001) }))).status).toBe(413);
  });
  it('does not claim delivery when configuration is missing', async () => {
    expect((await send(request(), {})).status).toBe(503);
  });
  it('reports provider rejection, malformed success, and network failure honestly', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 422 }))
      .mockResolvedValueOnce(new Response('{}'))
      .mockRejectedValueOnce(new Error('network')));
    for (let i = 0; i < 3; i++) expect((await send()).status).toBe(502);
  });
  it('throttles repeated sends from the same address', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'message-id' })));
    // Each fetch needs a fresh response body.
    fetch.mockImplementation(async () => new Response(JSON.stringify({ id: 'message-id' })));
    vi.stubGlobal('fetch', fetch);
    const ip = String(++address);
    for (let i = 0; i < 3; i++) expect((await send(request(), config, ip)).status).toBe(200);
    expect((await send(request(), config, ip)).status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
