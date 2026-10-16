import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ mutation: vi.fn() }));
vi.mock('@surreysocieties/admin', () => ({ createConvexClient: () => ({ mutation: mocks.mutation }) }));
import { POST } from './sign-in';
const secret = 'fixture-only-sign-in-gateway-secret';
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('PLANNER_SIGN_IN_SECRET', secret); mocks.mutation.mockResolvedValue('allowed'); });
afterEach(() => vi.unstubAllEnvs());
async function post(body: unknown, origin: string | null = 'https://society.test') {
  const request = new Request('https://society.test/api/planner/sign-in', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) });
  return POST({ request, url: new URL(request.url), clientAddress: '192.0.2.10' } as Parameters<typeof POST>[0]);
}
describe('custom sign-in access check', () => {
  it('accepts only same-origin, bounded, valid email requests', async () => {
    expect((await post({ email: 'committee@example.test' }, 'https://other.test')).status).toBe(403);
    expect((await post({ email: 'committee@example.test' }, null)).status).toBe(403);
    expect((await post({ email: 'invalid' })).status).toBe(400);
    expect((await post({ email: 'a'.repeat(2000) })).status).toBe(413);
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
  it('sends the normalized email and a keyed IP hash only to the backend', async () => {
    const response = await post({ email: ' Committee@Example.test ' });
    expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mocks.mutation).toHaveBeenCalledWith(expect.anything(), { email: 'committee@example.test', requester: expect.stringMatching(/^[a-f0-9]{64}$/), secret });
    expect(await response.json()).toEqual({ allowed: true });
  });
  it('denies unlisted emails and honours the backend request limit', async () => {
    mocks.mutation.mockResolvedValueOnce('denied').mockResolvedValueOnce('limited');
    expect((await post({ email: 'unknown@example.test' })).status).toBe(403);
    expect((await post({ email: 'committee@example.test' })).status).toBe(429);
  });
  it('fails closed when configuration or the access service is unavailable', async () => {
    vi.stubEnv('PLANNER_SIGN_IN_SECRET', '');
    expect((await post({ email: 'committee@example.test' })).status).toBe(503);
    expect(mocks.mutation).not.toHaveBeenCalled();
    vi.stubEnv('PLANNER_SIGN_IN_SECRET', secret); mocks.mutation.mockRejectedValue(new Error(`Private service error ${secret}`));
    const response = await post({ email: 'committee@example.test' });
    expect(response.status).toBe(503); expect(await response.text()).not.toContain(secret);
  });
});
