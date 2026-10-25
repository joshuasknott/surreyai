import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { del, get, put } from '@vercel/blob';
import { applicationsClosed } from './applicationWindow';
import { committeeFileType, readLimitedBody } from './committeeFile';

const CHUNK_BYTES = 3_000_000;
const MAX_FILE_BYTES = 15_000_000;
const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' };
const recentStarts = new Map<string, { count: number; until: number }>();
type Ticket = { id: string; size: number; type: string; expires: number };
type Config = { token?: string; deliveryReady: boolean };

const reply = (status: number, body: Record<string, unknown>) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest();
}

function readTicket(value: string, secret: string): Ticket | null {
  if (value.length > 1000) return null;
  try {
    const [payload, signature, extra] = value.split('.');
    if (!payload || !signature || extra) return null;
    const supplied = Buffer.from(signature, 'base64url');
    const expected = sign(payload, secret);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const ticket = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Ticket;
    if (!/^[a-f0-9-]{36}$/.test(ticket.id) || !Number.isInteger(ticket.size) || ticket.size < 1 || ticket.size > MAX_FILE_BYTES || !TYPES[ticket.type] || !Number.isFinite(ticket.expires) || ticket.expires <= Date.now()) return null;
    return ticket;
  } catch { return null; }
}

// Each browser request stays below Vercel's function body limit. Private storage
// holds the parts across function instances; the signed ticket confines writes
// and reads to one randomly named upload without exposing the storage token.
export async function handleCommitteeUpload(request: Request, config: Config, address = 'unknown'): Promise<Response> {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  if (action !== 'cancel' && applicationsClosed()) return reply(410, { message: 'Committee applications have closed.' });
  if (request.headers.get('origin') !== url.origin) return reply(403, { message: 'Please upload from the application form.' });
  if (!config.token || (!config.deliveryReady && action !== 'cancel')) return reply(503, { message: 'Uploads are temporarily unavailable. Please try again shortly.' });
  const token = config.token;
  try {
    if (action === 'start') {
      if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, { message: 'Invalid upload request.' });
      let input: { size?: number; type?: string };
      try { input = JSON.parse(new TextDecoder().decode(await readLimitedBody(request, 1000))); }
      catch (error) { if (error instanceof RangeError) throw error; return reply(400, { message: 'Invalid upload request.' }); }
      if (!Number.isInteger(input?.size) || !input.size || input.size < 1 || input.size > MAX_FILE_BYTES || !input.type || !TYPES[input.type]) return reply(400, { message: 'Please upload a PNG, JPG, WebP or PDF under 15 MB.' });
      const now = Date.now();
      for (const [key, entry] of recentStarts) if (entry.until <= now) recentStarts.delete(key);
      const entry = recentStarts.get(address);
      if ((entry && entry.count >= 5) || (!entry && recentStarts.size >= 1000)) return reply(429, { message: 'Please wait before starting another upload.' });
      recentStarts.set(address, { count: (entry?.count ?? 0) + 1, until: entry?.until ?? now + 10 * 60_000 });
      const ticket: Ticket = { id: randomUUID(), size: input.size, type: input.type, expires: now + 30 * 60_000 };
      const payload = Buffer.from(JSON.stringify(ticket)).toString('base64url');
      return reply(200, { ticket: `${payload}.${sign(payload, token).toString('base64url')}`, chunkBytes: CHUNK_BYTES });
    }
    if (action !== 'part' && action !== 'finish' && action !== 'cancel') return reply(400, { message: 'Invalid upload request.' });
    const ticket = readTicket(request.headers.get('x-upload-ticket') ?? '', token);
    if (!ticket) return reply(403, { message: 'Your upload session has expired. Please select your file again.' });
    const count = Math.ceil(ticket.size / CHUNK_BYTES);
    const pathname = `neurotech-committee-applications/${ticket.id}.${TYPES[ticket.type]}`;
    const partPath = (index: number) => `neurotech-committee-upload-parts/${ticket.id}/${index}`;
    const partSize = (index: number) => Math.min(CHUNK_BYTES, ticket.size - index * CHUNK_BYTES);
    if (action === 'cancel') {
      await del([pathname, ...Array.from({ length: count }, (_, index) => partPath(index))], { token });
      return reply(200, { cancelled: true });
    }
    if (action === 'part') {
      const suppliedIndex = url.searchParams.get('index') ?? '';
      if (!/^\d$/.test(suppliedIndex)) return reply(400, { message: 'Invalid upload part.' });
      const index = Number(suppliedIndex);
      if (index >= count) return reply(400, { message: 'Invalid upload part.' });
      const bytes = await readLimitedBody(request, CHUNK_BYTES);
      if (bytes.length !== partSize(index)) return reply(400, { message: 'Your upload was incomplete. Please retry.' });
      if (index === 0 && committeeFileType(bytes)?.mime !== ticket.type) return reply(400, { message: 'Please upload a valid PNG, JPG, WebP or PDF.' });
      await put(partPath(index), bytes, { access: 'private', token, contentType: 'application/octet-stream', addRandomSuffix: false, allowOverwrite: true, abortSignal: AbortSignal.timeout(20_000) });
      return reply(200, { uploaded: index });
    }
    // A lost final response can be retried without creating another file.
    const existing = await get(pathname, { access: 'private', token, useCache: false, abortSignal: AbortSignal.timeout(20_000) });
    if (existing?.statusCode === 200) {
      await existing.stream.cancel();
      return reply(200, { url: existing.blob.url });
    }
    const chunks: Uint8Array[] = [];
    const urls: string[] = [];
    for (let index = 0; index < count; index++) {
      const part = await get(partPath(index), { access: 'private', token, useCache: false, abortSignal: AbortSignal.timeout(20_000) });
      if (!part || part.statusCode !== 200) return reply(400, { message: 'Your upload was incomplete. Please select your file again.' });
      // Origin reads may omit Content-Length; check the actual bounded stream.
      const bytes = await readLimitedBody(new Response(part.stream), partSize(index));
      if (bytes.length !== partSize(index)) return reply(400, { message: 'Your upload was incomplete. Please select your file again.' });
      chunks.push(bytes);
      urls.push(part.blob.url);
    }
    const bytes = Buffer.concat(chunks, ticket.size);
    if (committeeFileType(bytes)?.mime !== ticket.type) return reply(400, { message: 'Please upload a valid PNG, JPG, WebP or PDF.' });
    const blob = await put(pathname, bytes, { access: 'private', token, contentType: ticket.type, addRandomSuffix: false, allowOverwrite: true, abortSignal: AbortSignal.timeout(30_000) });
    try { await del(urls, { token }); }
    catch { console.warn('committee_upload_part_cleanup_failed'); }
    return reply(200, { url: blob.url });
  } catch (error) {
    if (error instanceof RangeError) return reply(413, { message: 'This upload part is too large. Please retry from the application form.' });
    console.warn('committee_upload_storage_unavailable', { action });
    return reply(503, { message: 'The upload service is temporarily unavailable. Your answers are still on this page; please try again.' });
  }
}
