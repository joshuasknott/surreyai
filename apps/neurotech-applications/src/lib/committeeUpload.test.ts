import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { del, get, put } from '@vercel/blob';
import { handleCommitteeUpload } from './committeeUpload';

vi.mock('@vercel/blob', () => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }));
const config = { token: 'test-storage-secret', deliveryReady: true };
const origin = 'https://surrey-neurotech-applications.vercel.app';
let address = 0;
const req = (query: string, body?: BodyInit, headers: Record<string, string> = {}) => new Request(`${origin}/api/committee-upload-proxy?${query}`, { method: 'POST', body, headers: { origin, ...headers } });
const send = (request: Request, settings = config) => handleCommitteeUpload(request, settings, String(++address));
async function start(size = 10, type = 'image/png') {
  const response = await send(req('action=start', JSON.stringify({ size, type }), { 'Content-Type': 'application/json' }));
  expect(response.status).toBe(200);
  return (await response.json()).ticket as string;
}
const blob = (bytes: Uint8Array, url: string) => ({ statusCode: 200, blob: { size: 0, url, contentType: 'application/octet-stream' }, stream: new Response(Buffer.from(bytes)).body! }) as Awaited<ReturnType<typeof get>>;
const png = (size = 10) => { const bytes = new Uint8Array(size); bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); return bytes; };
beforeEach(() => { delete process.env.APPLICATIONS_CLOSE_AT; vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-07T14:00:00Z')); });
afterEach(() => { delete process.env.APPLICATIONS_CLOSE_AT; vi.useRealTimers(); vi.clearAllMocks(); vi.unstubAllEnvs(); });

describe('Neurotech same-origin mock-post uploads', () => {
  it('reassembles a 15 MB file from five private parts and cleans up those parts', async () => {
    const ticket = await start(15_000_000);
    const headers = { 'x-upload-ticket': ticket };
    for (let index = 0; index < 5; index++) {
      expect((await send(req(`action=part&index=${index}`, index === 0 ? png(3_000_000) : new Uint8Array(3_000_000), headers))).status).toBe(200);
    }
    expect(vi.mocked(put).mock.calls.every(call => call[2].access === 'private' && call[1] instanceof Uint8Array && call[1].length === 3_000_000)).toBe(true);
    vi.mocked(get).mockResolvedValueOnce(null);
    for (let index = 0; index < 5; index++) vi.mocked(get).mockResolvedValueOnce(blob(index === 0 ? png(3_000_000) : new Uint8Array(3_000_000), `https://example.private.blob.vercel-storage.com/part-${index}`));
    vi.mocked(put).mockResolvedValueOnce({ url: 'https://example.private.blob.vercel-storage.com/neurotech-committee-applications/final.png' } as Awaited<ReturnType<typeof put>>);
    const response = await send(req('action=finish', undefined, headers));
    expect(response.status).toBe(200);
    expect((await response.json()).url).toContain('/neurotech-committee-applications/');
    expect(vi.mocked(put).mock.lastCall?.[1]).toHaveLength(15_000_000);
    expect(del).toHaveBeenCalledWith(Array.from({ length: 5 }, (_, index) => `https://example.private.blob.vercel-storage.com/part-${index}`), { token: config.token });
  });

  it('rejects tampered, expired and missing tickets without accessing storage', async () => {
    const ticket = await start();
    for (const value of ['', `${ticket}x`, `x${ticket}`]) expect((await send(req('action=part&index=0', png(), { 'x-upload-ticket': value }))).status).toBe(403);
    vi.setSystemTime(new Date('2026-10-07T14:31:00Z'));
    expect((await send(req('action=part&index=0', png(), { 'x-upload-ticket': ticket }))).status).toBe(403);
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects oversized, incomplete, mismatched and out-of-range parts', async () => {
    const ticket = await start();
    const headers = { 'x-upload-ticket': ticket };
    expect((await send(req('action=part&index=0', png(3_000_001), headers))).status).toBe(413);
    expect((await send(req('action=part&index=0', png(9), headers))).status).toBe(400);
    expect((await send(req('action=part&index=0', new Uint8Array(10), headers))).status).toBe(400);
    expect((await send(req('action=part&index=1', png(), headers))).status).toBe(400);
    expect((await send(req('action=part&index=', png(), headers))).status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it('allows a lost final response to be retried without uploading another file', async () => {
    const ticket = await start();
    vi.mocked(get).mockResolvedValueOnce(blob(png(), 'https://example.private.blob.vercel-storage.com/final.png'));
    expect((await send(req('action=finish', undefined, { 'x-upload-ticket': ticket }))).status).toBe(200);
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects missing parts instead of reporting a successful upload', async () => {
    const ticket = await start();
    vi.mocked(get).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    expect((await send(req('action=finish', undefined, { 'x-upload-ticket': ticket }))).status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it('bounds storage streams even when Content-Length is missing', async () => {
    const ticket = await start();
    vi.mocked(get).mockResolvedValueOnce(null).mockResolvedValueOnce(blob(png(11), 'https://example.private.blob.vercel-storage.com/part'));
    expect((await send(req('action=finish', undefined, { 'x-upload-ticket': ticket }))).status).toBe(413);
    expect(put).not.toHaveBeenCalled();
  });

  it('only cancels the files belonging to a valid signed upload ticket', async () => {
    const ticket = await start(15_000_000);
    expect((await send(req('action=cancel', undefined, { 'x-upload-ticket': ticket }))).status).toBe(200);
    const paths = vi.mocked(del).mock.lastCall?.[0] as string[];
    expect(paths).toHaveLength(6);
    expect(paths[0]).toMatch(/^neurotech-committee-applications\/[a-f0-9-]{36}\.png$/);
    const id = paths[0].split('/')[1].replace('.png', '');
    expect(paths.slice(1)).toEqual(Array.from({ length: 5 }, (_, index) => `neurotech-committee-upload-parts/${id}/${index}`));
  });

  it('enforces same origin, configuration, type, size and the standalone deadline', async () => {
    expect((await send(new Request(`${origin}/api/committee-upload-proxy?action=start`, { method: 'POST' }))).status).toBe(403);
    expect((await send(req('action=start'), { token: '', deliveryReady: true })).status).toBe(503);
    for (const size of [0, -1, 15_000_001, 1.5]) expect((await send(req('action=start', JSON.stringify({ size, type: 'image/png' }), { 'Content-Type': 'application/json' }))).status).toBe(400);
    expect((await send(req('action=start', JSON.stringify({ size: 10, type: 'text/html' }), { 'Content-Type': 'application/json' }))).status).toBe(400);
    process.env.APPLICATIONS_CLOSE_AT = '2026-10-07T14:00:00Z';
    expect((await send(req('action=start'))).status).toBe(410);
    expect(put).not.toHaveBeenCalled();
  });
});
