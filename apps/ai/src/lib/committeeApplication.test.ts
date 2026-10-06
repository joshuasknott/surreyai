import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { del, get } from '@vercel/blob';
import { handleCommitteeApplication } from './committeeApplication';
import { COMMITTEE_APPLICATIONS_CLOSE_AT } from '@surreysocieties/ui/committeeDeadline';

vi.mock('@vercel/blob', () => ({ get: vi.fn(), del: vi.fn() }));

const config = { apiKey: 'test-key', fromEmail: 'Surrey AI Society <applications@surreyaisociety.org>' };
const postUrl = 'https://example.private.blob.vercel-storage.com/committee-applications/example.png';
let address = 0;

function request(role = 'workshops-learning', extras: Record<string, string> = {}, origin = 'https://surreyaisociety.org') {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    role, fullName: 'Test Applicant', email: 'student@surrey.ac.uk', course: 'Computer Science', yearOfStudy: 'Year 2',
    experience: 'I have run student club sessions.', motivation: 'I want to help people learn.', availability: '2 hours per week',
    workshopTopic: 'Introduction to useful AI tools', workshopOutline: 'Demo, exercise, discussion',
    postCaption: 'Join us for an AI workshop', postApproach: 'Accessible beginner content', consent: 'yes', ...extras,
  })) form.set(key, value);
  return new Request('https://surreyaisociety.org/api/committee-applications', { method: 'POST', headers: { origin }, body: form });
}

const send = (req = request(), options: { apiKey?: string; fromEmail?: string } = config) => handleCommitteeApplication(req, options, String(++address));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('committee application email delivery', () => {
  it('accepts applications right up until the closing time', async () => {
    vi.setSystemTime(new Date(Date.parse(COMMITTEE_APPLICATIONS_CLOSE_AT) - 1));
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'before-close-1' })));
    vi.stubGlobal('fetch', fetch);
    expect((await send()).status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('closes applications at the countdown deadline', async () => {
    vi.setSystemTime(new Date(COMMITTEE_APPLICATIONS_CLOSE_AT));
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await send()).status).toBe(410);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('sends the selected role and answers only to the reviewer inbox', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'sent-1' })));
    vi.stubGlobal('fetch', fetch);
    expect((await send()).status).toBe(200);
    const mail = JSON.parse(fetch.mock.calls[0][1].body);
    expect(mail.to).toEqual(['joshhknott@gmail.com']);
    expect(mail.reply_to).toBe('student@surrey.ac.uk');
    expect(mail.text).toContain('Workshops & Learning Officer');
    expect(mail.text).toContain('Introduction to useful AI tools');
  });

  it('sends Career & Opportunities answers and requires both', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'sent-career' })));
    vi.stubGlobal('fetch', fetch);
    const answers = { careerIdea: 'An alumni careers panel', careerPlan: 'Share options for beginners and keep links current' };
    expect((await send(request('career-opportunities', answers))).status).toBe(200);
    const mail = JSON.parse(fetch.mock.calls[0][1].body);
    expect(mail.text).toContain('Career & Opportunities Officer');
    expect(mail.text).toContain(answers.careerIdea);
    expect(mail.text).toContain(answers.careerPlan);
    expect((await send(request('career-opportunities', { ...answers, careerPlan: '' }))).status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects cross-origin and incomplete applications before sending', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await send(request('workshops-learning', {}, 'https://other.example'))).status).toBe(403);
    expect((await send(request('workshops-learning', { workshopTopic: '' }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('attaches a private uploaded mock post and deletes the temporary blob', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
    vi.mocked(get).mockResolvedValue({ statusCode: 200, blob: { size: bytes.byteLength, contentType: 'image/png' }, stream: new Response(bytes).body! } as Awaited<ReturnType<typeof get>>);
    vi.mocked(del).mockResolvedValue(undefined);
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'sent-2' })));
    vi.stubGlobal('fetch', fetch);
    expect((await send(request('social-media-content', { mockPostUrl: postUrl }))).status).toBe(200);
    const mail = JSON.parse(fetch.mock.calls[0][1].body);
    expect(mail.attachments[0].filename).toBe('social-post-test-applicant.png');
    expect(mail.attachments[0].content).toBe(Buffer.from(bytes).toString('base64'));
    expect(del).toHaveBeenCalledWith(postUrl);
  });

  it('will not fetch a supplied public or unrelated URL', async () => {
    expect((await send(request('social-media-content', { mockPostUrl: 'https://attacker.example/file.png' }))).status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });

  it('removes a rejected temporary mock post', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    vi.mocked(get).mockResolvedValue({ statusCode: 200, blob: { size: bytes.byteLength, contentType: 'image/png' }, stream: new Response(bytes).body! } as Awaited<ReturnType<typeof get>>);
    vi.mocked(del).mockResolvedValue(undefined);
    expect((await send(request('social-media-content', { mockPostUrl: postUrl }))).status).toBe(400);
    expect(del).toHaveBeenCalledWith(postUrl);
  });

  it('does not accept an application when the email provider is not configured', async () => {
    expect((await send(request(), {})).status).toBe(503);
  });
});
