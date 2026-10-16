import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn(), prepare: vi.fn() }));
vi.mock('@surreysocieties/admin', () => ({ createConvexClient: () => ({ query: mocks.query, mutation: mocks.mutation }) }));
vi.mock('../../../lib/server/plannerAccounts', () => ({ ensurePlannerAccount: mocks.prepare }));
import { POST } from './access';

async function post(body: unknown, token = 'owner-token', origin = 'https://society.test') {
  const request = new Request('https://society.test/api/planner/access', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return POST({ request, url: new URL(request.url) } as Parameters<typeof POST>[0]);
}
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fixture'); mocks.query.mockResolvedValue({ canManageAccess: true }); mocks.prepare.mockResolvedValue(undefined); mocks.mutation.mockResolvedValue(null); });
afterEach(() => vi.unstubAllEnvs());

describe('owner email access endpoint', () => {
  it('rejects anonymous requests and requests from another origin before contacting services', async () => {
    expect((await post({ email: 'committee@example.test' }, '')).status).toBe(401);
    expect((await post({ email: 'committee@example.test' }, 'owner-token', 'https://other.test')).status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it('rejects non-owner accounts before preparing any sign-in account or grant', async () => {
    mocks.query.mockResolvedValue({ canManageAccess: false });
    expect((await post({ email: 'committee@example.test' })).status).toBe(403);
    expect(mocks.prepare).not.toHaveBeenCalled(); expect(mocks.mutation).not.toHaveBeenCalled();
  });
  it('validates email and request bounds before creating accounts', async () => {
    expect((await post({ email: 'invalid' })).status).toBe(400);
    expect((await post({ email: 'a'.repeat(2000) })).status).toBe(413);
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it('only grants access after sign-in preparation succeeds', async () => {
    mocks.prepare.mockRejectedValue(new Error('Provider unavailable'));
    expect((await post({ email: 'committee@example.test' })).status).toBe(502);
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
  it('normalizes the email and rechecks owner authority through the mutation', async () => {
    const response = await post({ email: ' Committee@Example.test ' });
    expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mocks.prepare).toHaveBeenCalledWith('committee@example.test', 'sk_test_fixture');
    expect(mocks.mutation).toHaveBeenCalledWith(expect.anything(), { email: 'committee@example.test', active: true });
  });
});
