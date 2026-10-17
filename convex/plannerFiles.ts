import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

const maxBytes = 10 * 1024 * 1024;
const types = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);

function cors(request: Request): Headers | null {
  const origin = request.headers.get('origin');
  if (origin && !/^https:\/\/(?:www\.)?surreyaisociety\.org$/.test(origin) && !/^http:\/\/(?:localhost|127\.0\.0\.1):4321$/.test(origin) && !/^https:\/\/surrey-ai-society-[a-z0-9-]+\.vercel\.app$/.test(origin)) return null;
  const headers = new Headers({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' });
  if (origin) headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-File-Name, X-Request-Id');
  headers.set('Access-Control-Expose-Headers', 'Content-Disposition');
  return headers;
}

function json(body: unknown, status: number, headers: Headers) {
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers });
}

function matchesType(bytes: Uint8Array, type: string) {
  const ascii = new TextDecoder('ascii').decode(bytes.slice(0, 16));
  if (type === 'application/pdf') return ascii.startsWith('%PDF-');
  if (type === 'image/png') return bytes[0] === 137 && ascii.slice(1, 4) === 'PNG' && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10;
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/gif') return ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a');
  if (type === 'image/webp') return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
  return type === 'image/avif' && ascii.slice(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii.slice(8, 12));
}

export const fileOptions = httpAction(async (_ctx, request) => {
  const headers = cors(request);
  return new Response(null, { status: headers ? 204 : 403, headers: headers || {} });
});

export const uploadFile = httpAction(async (ctx, request) => {
  const headers = cors(request);
  if (!headers) return new Response(null, { status: 403 });
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return json({ error: 'Committee sign-in required' }, 401, headers);
  const itemId = new URL(request.url).searchParams.get('itemId') as Id<'plannerItems'> | null;
  if (!itemId) return json({ error: 'Choose a card first' }, 400, headers);
  try { await ctx.runQuery(internal.planner.fileUploadAccess, { id: itemId, requestId: request.headers.get('x-request-id') || '' }); }
  catch { return json({ error: 'Committee access to this card is required, or the file limit has been reached' }, 403, headers); }
  const contentType = request.headers.get('content-type')?.split(';')[0].toLowerCase() || '';
  if (!types.has(contentType)) return json({ error: 'Choose a PDF, PNG, JPEG, GIF, WebP or AVIF image' }, 415, headers);
  let name: string;
  try { name = decodeURIComponent(request.headers.get('x-file-name') || '').trim(); } catch { return json({ error: 'Use a valid file name' }, 400, headers); }
  const requestId = request.headers.get('x-request-id') || '';
  if (!name || name.length > 160 || /[\p{Cc}\p{Cf}]/u.test(name) || !/^[a-f\d-]{36}$/i.test(requestId)) return json({ error: 'Use a file name up to 160 characters and retry the upload' }, 400, headers);
  if (Number(request.headers.get('content-length')) > maxBytes) return json({ error: 'Choose a file up to 10 MB' }, 413, headers);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Choose a file' }, 400, headers);
  const chunks: Uint8Array<ArrayBuffer>[] = []; let total = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > maxBytes) { await reader.cancel(); return json({ error: 'Choose a file up to 10 MB' }, 413, headers); } chunks.push(new Uint8Array(value)); }
  } catch { return json({ error: 'Upload interrupted. Try again' }, 400, headers); }
  const blob = new Blob(chunks, { type: contentType });
  if (!matchesType(new Uint8Array(await blob.slice(0, 16).arrayBuffer()), contentType)) return json({ error: 'This file does not match its PDF or image type' }, 415, headers);
  const storageId = await ctx.storage.store(blob);
  try {
    const result = await ctx.runMutation(internal.planner.attachUploadedFile, { id: itemId, storageId, name, contentType, requestId });
    if (result.reused) await ctx.storage.delete(storageId);
    return json({ fileId: result.id }, 200, headers);
  } catch {
    await ctx.storage.delete(storageId);
    return json({ error: 'Could not attach this file. Check committee access and try again' }, 403, headers);
  }
});

export const downloadFile = httpAction(async (ctx, request) => {
  const headers = cors(request);
  if (!headers) return new Response(null, { status: 403 });
  if (!await ctx.auth.getUserIdentity()) return json({ error: 'Committee sign-in required' }, 401, headers);
  const id = new URL(request.url).searchParams.get('fileId') as Id<'plannerFiles'> | null;
  if (!id) return json({ error: 'Choose an attachment' }, 400, headers);
  try {
    const file = await ctx.runQuery(internal.planner.fileDownloadAccess, { id });
    const blob = await ctx.storage.get(file.storageId);
    if (!blob) return json({ error: 'Attachment not found' }, 404, headers);
    headers.set('Content-Type', file.contentType);
    headers.set('Content-Disposition', `attachment; filename="${file.name.replace(/[^a-zA-Z0-9._ -]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`);
    return new Response(blob, { headers });
  } catch { return json({ error: 'Committee access to this attachment is required' }, 403, headers); }
});
