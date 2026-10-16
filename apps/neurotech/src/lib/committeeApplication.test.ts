import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { del, get } from '@vercel/blob';
import { handleCommitteeApplication } from './committeeApplication';
import { COMMITTEE_APPLICATIONS_CLOSE_AT, NEUROTECH_COMMITTEE_APPLICATIONS_CLOSE_AT, committeeApplicationsClosed } from '@surreysocieties/ui/committeeDeadline';

vi.mock('@vercel/blob', () => ({ get: vi.fn(), del: vi.fn() }));

const config = { apiKey: 'test-key', fromEmail: 'Surrey Neurotech Society <applications@surreyneurotechsociety.org>' };
const postUrl = 'https://example.private.blob.vercel-storage.com/neurotech-committee-applications/example.png';
let address = 0;

function request(role = 'workshops-projects', extras: Record<string, string> = {}, origin = 'https://surreyneurotechsociety.org') {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    role, fullName: 'Test Applicant', email: 'student@surrey.ac.uk', course: 'Psychology', yearOfStudy: 'Year 2',
    experience: 'I have helped organise a student workshop.', motivation: 'I want to make neurotech welcoming.', availability: '2 hours per week',
    workshopIdea: 'An introduction to brain signals', workshopPlan: 'Demo, activity, discussion',
    postCaption: 'Join our neurotech workshop', postApproach: 'Accessible beginner content', consent: 'yes', ...extras,
  })) form.set(key, value);
  return new Request('https://surreyneurotechsociety.org/api/committee-applications', { method: 'POST', headers: { origin }, body: form });
}

const send = (req = request(), options: { apiKey?: string; fromEmail?: string } = config) => handleCommitteeApplication(req, options, String(++address));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('Neurotech committee applications', () => {
  it('sends role answers to the requested inbox', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'sent-1' })));
    vi.stubGlobal('fetch', fetch);
    expect((await send()).status).toBe(200);
    const mail = JSON.parse(fetch.mock.calls[0][1].body);
    expect(mail.to).toEqual(['joshhknott@gmail.com']);
    expect(mail.subject).toContain('Neurotech Society committee application');
    expect(mail.text).toContain('An introduction to brain signals');
  });

  it('rejects cross-origin and incomplete forms before sending', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await send(request('workshops-projects', {}, 'https://other.example'))).status).toBe(403);
    expect((await send(request('workshops-projects', { workshopIdea: '' }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('emails the private mock post as an attachment and removes the temporary upload', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
    vi.mocked(get).mockResolvedValue({ statusCode: 200, blob: { size: bytes.byteLength, contentType: 'image/png' }, stream: new Response(bytes).body! } as Awaited<ReturnType<typeof get>>);
    vi.mocked(del).mockResolvedValue(undefined);
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'sent-2' })));
    vi.stubGlobal('fetch', fetch);
    expect((await send(request('social-media-content', { mockPostUrl: postUrl }))).status).toBe(200);
    const mail = JSON.parse(fetch.mock.calls[0][1].body);
    expect(mail.attachments[0].filename).toBe('social-post-test-applicant.png');
    expect(del).toHaveBeenCalledWith(postUrl);
  });

  it('rejects unrelated upload URLs and missing delivery configuration', async () => {
    expect((await send(request('social-media-content', { mockPostUrl: 'https://attacker.example/file.png' }))).status).toBe(400);
    expect(get).not.toHaveBeenCalled();
    expect((await send(request(), {})).status).toBe(503);
  });

  it('keeps an attachment after uncertain delivery and deduplicates the email retry', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
    const stored = () => ({ statusCode: 200, blob: { size: bytes.byteLength, contentType: 'image/png' }, stream: new Response(bytes).body! }) as Awaited<ReturnType<typeof get>>;
    vi.mocked(get).mockImplementation(async () => stored());
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(Response.json({ id: 'retry-confirmed' }));
    vi.stubGlobal('fetch', fetch);
    expect((await send(request('social-media-content', { mockPostUrl: postUrl }))).status).toBe(502);
    expect(del).not.toHaveBeenCalled();
    expect((await send(request('social-media-content', { mockPostUrl: postUrl }))).status).toBe(200);
    expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe(fetch.mock.calls[1][1].headers['Idempotency-Key']);
    expect(del).toHaveBeenCalledWith(postUrl);
  });

  it('accepts an attachment when storage omits its Content-Length header', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
    vi.mocked(get).mockResolvedValue({ statusCode: 200, blob: { size: 0, contentType: 'image/png' }, stream: new Response(bytes).body! } as Awaited<ReturnType<typeof get>>);
    const fetch = vi.fn().mockResolvedValue(Response.json({ id: 'no-length-header' }));
    vi.stubGlobal('fetch', fetch);
    expect((await send(request('social-media-content', { mockPostUrl: postUrl }))).status).toBe(200);
    expect(JSON.parse(fetch.mock.calls[0][1].body).attachments[0].content).toBe(Buffer.from(bytes).toString('base64'));
  });

  it('keeps Neurotech open after AI closes', async () => {
    vi.setSystemTime(new Date(COMMITTEE_APPLICATIONS_CLOSE_AT));
    expect(committeeApplicationsClosed()).toBe(true);
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'neurotech-still-open' })));
    vi.stubGlobal('fetch', fetch);
    expect((await send()).status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('accepts applications right up until the closing time', async () => {
    vi.setSystemTime(new Date(Date.parse(NEUROTECH_COMMITTEE_APPLICATIONS_CLOSE_AT) - 1));
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'before-close-1' })));
    vi.stubGlobal('fetch', fetch);
    expect((await send()).status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('closes applications at the countdown deadline', async () => {
    vi.setSystemTime(new Date(NEUROTECH_COMMITTEE_APPLICATIONS_CLOSE_AT));
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await send()).status).toBe(410);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires and emails both Wellbeing Champion answers', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'sent-wellbeing' })));
    vi.stubGlobal('fetch', fetch);
    const answers = { wellbeingResponse: 'Listen privately and ask what would help.', wellbeingImprovement: 'Offer a beginner introduction and clearer group activities.' };
    expect((await send(request('wellbeing-champion', answers))).status).toBe(200);
    const mail = JSON.parse(fetch.mock.calls[0][1].body);
    expect(mail.subject).toContain('Wellbeing Champion');
    expect(mail.text).toContain(answers.wellbeingResponse);
    expect(mail.text).toContain(answers.wellbeingImprovement);
    expect((await send(request('wellbeing-champion', { ...answers, wellbeingImprovement: '' }))).status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
