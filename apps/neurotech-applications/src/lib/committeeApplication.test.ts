import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { del, get } from '@vercel/blob';
import { handleCommitteeApplication } from './committeeApplication';

vi.mock('@vercel/blob', () => ({ get: vi.fn(), del: vi.fn() }));

const config = { apiKey: 'test-key', fromEmail: 'Surrey Neurotech Society <applications@surreyneurotechsociety.org>' };
let address = 0;

function request(role = 'workshops-projects', extras: Record<string, string> = {}, origin = 'https://surrey-neurotech-applications.vercel.app') {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    role, fullName: 'Test Applicant', email: 'student@surrey.ac.uk', course: 'Psychology', yearOfStudy: 'Year 2',
    experience: 'I have helped organise a student workshop.', motivation: 'I want to make neurotech welcoming.', availability: '2 hours per week',
    workshopIdea: 'An introduction to brain signals', workshopPlan: 'Demo, activity, discussion',
    postCaption: 'Join our neurotech workshop', postApproach: 'Accessible beginner content', consent: 'yes', ...extras,
  })) form.set(key, value);
  return new Request('https://surrey-neurotech-applications.vercel.app/api/committee-applications', { method: 'POST', headers: { origin }, body: form });
}

const send = (req = request(), options: { apiKey?: string; fromEmail?: string } = config) => handleCommitteeApplication(req, options, String(++address));
beforeEach(() => {
  delete process.env.APPLICATIONS_CLOSE_AT;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
});

afterEach(() => { delete process.env.APPLICATIONS_CLOSE_AT; vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

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

  it.each(['social-media-content', 'wellbeing-champion'])('rejects applications for the filled %s role', async (role) => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await send(request(role))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('rejects missing delivery configuration', async () => {
    expect((await send(request(), {})).status).toBe(503);
  });

  it('deduplicates an email retry after uncertain delivery', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(Response.json({ id: 'retry-confirmed' }));
    vi.stubGlobal('fetch', fetch);
    expect((await send()).status).toBe(502);
    expect((await send()).status).toBe(200);
    expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe(fetch.mock.calls[1][1].headers['Idempotency-Key']);
  });

  it('stays open when no standalone deadline is configured', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'neurotech-still-open' })));
    vi.stubGlobal('fetch', fetch);
    expect((await send()).status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('accepts applications right up until the closing time', async () => {
    vi.stubEnv('APPLICATIONS_CLOSE_AT', '2026-10-19T12:00:01Z');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'before-close-1' })));
    vi.stubGlobal('fetch', fetch);
    expect((await send()).status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('closes applications only at its independently configured deadline', async () => {
    vi.stubEnv('APPLICATIONS_CLOSE_AT', '2026-10-19T12:00:00Z');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await send()).status).toBe(410);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires and emails both Industry and Partnerships answers', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ id: 'sent-partnerships' }));
    vi.stubGlobal('fetch', fetch);
    const answers = { partnerIdea: 'A neuroscience research group.', partnershipPitch: 'Invite a researcher to give an accessible talk.' };
    expect((await send(request('industry-partnerships', answers))).status).toBe(200);
    const mail = JSON.parse(fetch.mock.calls[0][1].body);
    expect(mail.subject).toContain('Industry & Partnerships Officer');
    expect(mail.text).toContain(answers.partnerIdea);
    expect(mail.text).toContain(answers.partnershipPitch);
    expect((await send(request('industry-partnerships', { ...answers, partnershipPitch: '' }))).status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
