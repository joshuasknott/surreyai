import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn(), generate: vi.fn() }));
vi.mock('@surreysocieties/admin', () => ({ createConvexClient: () => ({ query: mocks.query, mutation: mocks.mutation }) }));
vi.mock('../../../lib/server/ai/gemini', () => ({ isAIEnabled: () => true, generateContent: mocks.generate }));
import { POST } from './draft';
beforeEach(() => { vi.clearAllMocks(); mocks.query.mockResolvedValue({ email: 'committee@example.test' }); mocks.mutation.mockResolvedValue(true); mocks.generate.mockResolvedValue(JSON.stringify({ description: 'A welcoming workshop.' })); });
afterEach(() => vi.restoreAllMocks());
async function post(body: unknown, token = 'fixture-token') {
  const request = new Request('https://society.test/api/planner/draft', { method: 'POST', headers: { Origin: 'https://society.test', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return POST({ request, url: new URL(request.url) } as Parameters<typeof POST>[0]);
}
describe('embedded description assistance', () => {
  it('returns only the suggested description and does not save or publish', async () => {
    const response = await post({ focus: 'description', prompt: 'Title: Beginners workshop' });
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ description: 'A welcoming workshop.' });
    expect(mocks.generate).toHaveBeenCalledWith(expect.stringContaining('Do not invent dates, rooms'), expect.objectContaining({ responseSchema: expect.objectContaining({ required: ['description'] }) }));
    expect(mocks.mutation).toHaveBeenCalledTimes(1);
  });
  it('requires committee access before generating suggestions', async () => {
    expect((await post({ focus: 'description', prompt: 'Workshop' }, '')).status).toBe(401);
    mocks.query.mockResolvedValue(null);
    expect((await post({ focus: 'description', prompt: 'Workshop' })).status).toBe(403);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('validates intent and enforces the existing AI allowance', async () => {
    expect((await post({ focus: 'publish', prompt: 'Workshop' })).status).toBe(400);
    mocks.mutation.mockResolvedValue(false);
    expect((await post({ focus: 'description', prompt: 'Workshop' })).status).toBe(429);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('rejects malformed or overlong provider output', async () => {
    for (const output of ['invalid JSON', '{}', JSON.stringify({ description: 'x'.repeat(4001) })]) {
      mocks.generate.mockResolvedValueOnce(output);
      expect((await post({ focus: 'description', prompt: 'Workshop' })).status).toBe(502);
    }
  });
});
