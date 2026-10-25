import { afterEach, expect, it, vi } from 'vitest';
import { uploadCommitteeFile } from './committeeUploadClient';

afterEach(() => vi.unstubAllGlobals());
const json = (body: object, status = 200) => Response.json(body, { status });

it('sends all 15 MB through same-origin requests no larger than 3 MB', async () => {
  const fetch = vi.fn().mockResolvedValue(json({ uploaded: 0 }));
  fetch.mockResolvedValueOnce(json({ ticket: 'signed-ticket', chunkBytes: 3_000_000 }));
  for (let i = 0; i < 5; i++) fetch.mockResolvedValueOnce(json({ uploaded: i }));
  fetch.mockResolvedValueOnce(json({ url: 'https://example.private.blob.vercel-storage.com/file.png' }));
  vi.stubGlobal('fetch', fetch);
  const progress = vi.fn();
  expect(await uploadCommitteeFile(new File([new Uint8Array(15_000_000)], 'post.png', { type: 'image/png' }), progress)).toContain('file.png');
  expect(fetch).toHaveBeenCalledTimes(7);
  expect(fetch.mock.calls.every(call => call[0].startsWith('/api/committee-upload-proxy?'))).toBe(true);
  expect(fetch.mock.calls.filter(call => call[0].includes('action=part')).every(call => call[1].body.size === 3_000_000)).toBe(true);
  expect(progress).toHaveBeenLastCalledWith(100);
});

it('retries a lost part request with the same ticket and part index', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(json({ ticket: 'signed-ticket', chunkBytes: 3_000_000 }))
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(json({ uploaded: 0 }))
    .mockResolvedValueOnce(json({ url: 'https://example.private.blob.vercel-storage.com/file.png' }));
  vi.stubGlobal('fetch', fetch);
  await uploadCommitteeFile(new File(['png'], 'post.png', { type: 'image/png' }), vi.fn());
  expect(fetch.mock.calls[1][0]).toBe(fetch.mock.calls[2][0]);
  expect(fetch.mock.calls[1][1].headers).toEqual(fetch.mock.calls[2][1].headers);
});

it('bounds retries and gives useful connection advice instead of Failed to fetch', async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  vi.stubGlobal('fetch', fetch);
  await expect(uploadCommitteeFile(new File(['png'], 'post.png', { type: 'image/png' }), vi.fn())).rejects.toThrow('Your answers are still on this page');
  expect(fetch).toHaveBeenCalledTimes(3);
});

it('does not retry rejected or expired uploads', async () => {
  const fetch = vi.fn().mockResolvedValue(json({ message: 'Committee applications have closed.' }, 410));
  vi.stubGlobal('fetch', fetch);
  await expect(uploadCommitteeFile(new File(['png'], 'post.png', { type: 'image/png' }), vi.fn())).rejects.toThrow('Committee applications have closed.');
  expect(fetch).toHaveBeenCalledOnce();
});

it('cleans up an abandoned upload after a part is rejected', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(json({ ticket: 'signed-ticket', chunkBytes: 3_000_000 }))
    .mockResolvedValueOnce(json({ message: 'Invalid file.' }, 400))
    .mockResolvedValueOnce(json({ cancelled: true }));
  vi.stubGlobal('fetch', fetch);
  await expect(uploadCommitteeFile(new File(['png'], 'post.png', { type: 'image/png' }), vi.fn())).rejects.toThrow('Invalid file.');
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch.mock.calls[2][0]).toBe('/api/committee-upload-proxy?action=cancel');
  expect(fetch.mock.calls[2][1].headers).toEqual({ 'x-upload-ticket': 'signed-ticket' });
});
