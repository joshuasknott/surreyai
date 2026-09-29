import { getCommitteeRole } from '../data/committeeRoles';
import { del, get } from '@vercel/blob';

type DeliveryConfig = { apiKey?: string; fromEmail?: string };
type Upload = { filename: string; content: string };

const recentAttempts = new Map<string, { count: number; until: number }>();
const MAX_BODY_BYTES = 4_000_000;
const MAX_FILE_BYTES = 15_000_000;
const MAX_ANSWER_LENGTH = 2000;
const OWNER_EMAIL = 'joshhknott@gmail.com';

function reply(status: number, message: string) {
  return new Response(JSON.stringify({ message }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

function field(form: FormData, key: string, max: number) {
  const value = form.get(key);
  return typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
}

function fileType(bytes: Uint8Array): { extension: string; mime: string } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return { extension: 'png', mime: 'image/png' };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension: 'jpg', mime: 'image/jpeg' };
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return { extension: 'webp', mime: 'image/webp' };
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-') return { extension: 'pdf', mime: 'application/pdf' };
  return null;
}

export async function handleCommitteeApplication(request: Request, config: DeliveryConfig, clientAddress = 'unknown'): Promise<Response> {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply(403, 'Please use the application form on our website.');
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return reply(415, 'Please use the application form.');
  const statedLength = Number(request.headers.get('content-length'));
  if (statedLength > MAX_BODY_BYTES) return reply(413, 'The application form is too large. Please shorten your answers.');
  if (!config.apiKey || !config.fromEmail) return reply(503, 'Applications are temporarily unavailable. Please try again later.');

  let form: FormData;
  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return reply(413, 'The application form is too large. Please shorten your answers.');
    form = await new Request(request.url, { method: 'POST', headers: { 'content-type': request.headers.get('content-type')! }, body }).formData();
  } catch { return reply(400, 'Please check the form and try again.'); }
  if (field(form, 'website', 500)) return reply(400, 'Please leave the website field empty.');
  const role = getCommitteeRole(field(form, 'role', 80));
  if (!role) return reply(400, 'Please select a valid role.');

  const name = field(form, 'fullName', 120);
  const email = field(form, 'email', 254);
  const course = field(form, 'course', 150);
  const year = field(form, 'yearOfStudy', 60);
  const experience = field(form, 'experience', MAX_ANSWER_LENGTH);
  const motivation = field(form, 'motivation', MAX_ANSWER_LENGTH);
  const availability = field(form, 'availability', 300);
  if (!name || /[\r\n\x00-\x1f]/.test(name) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !course || !year || !experience || !motivation || !availability || field(form, 'consent', 10) !== 'yes') {
    return reply(400, 'Please complete all required fields with a valid email address.');
  }
  const answers = role.questions.map((question) => ({ label: question.label, value: field(form, question.key, MAX_ANSWER_LENGTH) }));
  if (answers.some((answer) => !answer.value)) return reply(400, 'Please complete both role questions.');

  const now = Date.now();
  for (const [key, value] of recentAttempts) if (value.until <= now) recentAttempts.delete(key);
  const entry = recentAttempts.get(clientAddress);
  if (entry && entry.count >= 3) return reply(429, 'Please wait a few minutes before trying again.');
  if (!entry && recentAttempts.size >= 1000) return reply(429, 'Please try again shortly.');
  recentAttempts.set(clientAddress, { count: (entry?.count ?? 0) + 1, until: entry?.until ?? now + 10 * 60_000 });

  let upload: Upload | undefined;
  let blobUrl: string | undefined;
  if (role.slug === 'social-media-content') {
    const suppliedUrl = field(form, 'mockPostUrl', 500);
    let parsedUrl: URL;
    try { parsedUrl = new URL(suppliedUrl); }
    catch { return reply(400, 'Please upload your mock post before submitting.'); }
    if (parsedUrl.protocol !== 'https:' || !/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/.test(parsedUrl.hostname) || !parsedUrl.pathname.startsWith('/committee-applications/') || parsedUrl.search || parsedUrl.hash) {
      return reply(400, 'Please upload your mock post using the application form.');
    }
    blobUrl = parsedUrl.href;
    try {
      const result = await get(blobUrl, { access: 'private' });
      if (!result || result.statusCode !== 200 || result.blob.size === 0 || result.blob.size > MAX_FILE_BYTES) return reply(400, 'Please upload a mock post under 15 MB.');
      const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
      const type = fileType(bytes);
      if (!type || type.mime !== result.blob.contentType) return reply(400, 'Please upload a PNG, JPG, WebP or PDF file.');
      upload = { filename: `social-post-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}.${type.extension}`, content: Buffer.from(bytes).toString('base64') };
    } catch { return reply(400, 'We could not read your upload. Please upload it again.'); }
    finally { if (!upload) { try { await del(blobUrl); } catch { /* A temporary upload can still expire normally. */ } } }
  }

  const lines = [
    `Committee application 2026–27`, `Role: ${role.title}`, '',
    `Name: ${name}`, `Email: ${email}`, `Course: ${course}`, `Year of study: ${year}`, `Availability: ${availability}`, '',
    'Relevant experience', experience, '', 'Why they want to join', motivation, '',
    'Role task', role.task, '', ...answers.flatMap((answer) => [answer.label, answer.value, '']),
    upload ? `Mock post: attached as ${upload.filename}` : '',
  ];
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.fromEmail,
        to: [OWNER_EMAIL],
        reply_to: email,
        subject: `AI Society committee application: ${role.title} — ${name}`,
        text: lines.join('\n'),
        ...(upload ? { attachments: [upload] } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json() as { id?: unknown };
    if (!response.ok || typeof result.id !== 'string' || !result.id) return reply(502, 'We could not confirm delivery. Please try again later.');
    return reply(200, 'Your application has been sent.');
  } catch { return reply(502, 'We could not confirm delivery. Please try again later.'); }
  finally { if (blobUrl) { try { await del(blobUrl); } catch { /* Avoid retaining an upload if deletion temporarily fails. */ } } }
}
