import type { APIRoute } from 'astro';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const prerender = false;
const recentTokens = new Map<string, { count: number; until: number }>();
const MAX_FILE_BYTES = 15_000_000;

const respond = (status: number, message: string) => new Response(JSON.stringify({ message }), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!import.meta.env.RESEND_API_KEY || !import.meta.env.COMMITTEE_FROM_EMAIL) return respond(503, 'Applications are temporarily unavailable.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) return respond(415, 'Invalid upload request.');
  if (Number(request.headers.get('content-length')) > 20_000) return respond(413, 'Invalid upload request.');

  let body: HandleUploadBody;
  try {
    const rawBody = await request.arrayBuffer();
    if (rawBody.byteLength > 20_000) return respond(413, 'Invalid upload request.');
    body = JSON.parse(new TextDecoder().decode(rawBody)) as HandleUploadBody;
  }
  catch { return respond(400, 'Invalid upload request.'); }

  if (body.type === 'blob.generate-client-token') {
    if (request.headers.get('origin') !== new URL(request.url).origin) return respond(403, 'Please upload from the application form.');
    const now = Date.now();
    for (const [key, entry] of recentTokens) if (entry.until <= now) recentTokens.delete(key);
    const key = clientAddress || 'unknown';
    const entry = recentTokens.get(key);
    if (entry && entry.count >= 5) return respond(429, 'Please wait before uploading another file.');
    if (!entry && recentTokens.size >= 1000) return respond(429, 'Please try again shortly.');
    recentTokens.set(key, { count: (entry?.count ?? 0) + 1, until: entry?.until ?? now + 10 * 60_000 });
  }

  try {
    const result = await handleUpload({
      body, request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^committee-applications\/[a-f0-9-]{36}\.(png|jpg|webp|pdf)$/.test(pathname)) throw new Error('Invalid upload path.');
        return {
          allowedContentTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
          maximumSizeInBytes: MAX_FILE_BYTES,
          validUntil: Date.now() + 5 * 60_000,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return respond(400, 'We could not prepare your upload. Please try again.'); }
};
