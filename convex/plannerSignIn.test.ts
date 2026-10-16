/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const secret = 'fixture-only-sign-in-gateway-secret';
const requester = 'a'.repeat(64);
beforeEach(() => vi.stubEnv('PLANNER_SIGN_IN_SECRET', secret));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
async function setup() {
  const t = convexTest(schema, modules);
  const grantId = await t.run(async ctx => {
    const societyId = await ctx.db.insert('societies', { name: 'AI', shortName: 'AI', slug: 'ai', domain: 'example.test' });
    return ctx.db.insert('plannerAccess', { societyId, email: 'committee@example.test', active: true });
  });
  return { t, grantId };
}
describe('committee sign-in gate', () => {
  it('rejects direct callers without the server secret before disclosing access or storing a request', async () => {
    const { t } = await setup();
    await expect(t.mutation(api.plannerSignIn.requestCode, { email: 'joshhknott@gmail.com', requester, secret: 'wrong' })).rejects.toThrow('Sign-in service access required');
    expect(await t.run(ctx => ctx.db.query('agentRateLimits').take(1))).toEqual([]);
  });
  it('allows the owner and explicitly granted emails, then denies a revoked email', async () => {
    const { t, grantId } = await setup();
    expect(await t.mutation(api.plannerSignIn.requestCode, { email: 'joshhknott@gmail.com', requester, secret })).toBe('allowed');
    expect(await t.mutation(api.plannerSignIn.requestCode, { email: ' Committee@Example.test ', requester, secret })).toBe('allowed');
    await t.run(ctx => ctx.db.patch(grantId, { active: false }));
    expect(await t.mutation(api.plannerSignIn.requestCode, { email: 'committee@example.test', requester, secret })).toBe('denied');
    expect(await t.mutation(api.plannerSignIn.requestCode, { email: 'unknown@example.test', requester, secret })).toBe('denied');
  });
  it('does not inherit access from other societies or society roles', async () => {
    const { t } = await setup();
    await t.run(async ctx => {
      const societyId = await ctx.db.insert('societies', { name: 'Business', shortName: 'Business', slug: 'business', domain: 'business.test' });
      await ctx.db.insert('plannerAccess', { societyId, email: 'business@example.test', active: true });
    });
    expect(await t.mutation(api.plannerSignIn.requestCode, { email: 'business@example.test', requester, secret })).toBe('denied');
  });
  it('limits allowed email requests across callers and resets after the time window', async () => {
    const { t } = await setup();
    const now = Date.now(); const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    for (let i = 0; i < 5; i++) expect(await t.mutation(api.plannerSignIn.requestCode, { email: 'committee@example.test', requester: i.toString().repeat(64), secret })).toBe('allowed');
    expect(await t.mutation(api.plannerSignIn.requestCode, { email: 'committee@example.test', requester, secret })).toBe('limited');
    clock.mockReturnValue(now + 600_001);
    expect(await t.mutation(api.plannerSignIn.requestCode, { email: 'committee@example.test', requester, secret })).toBe('allowed');
  });
  it('limits repeated unknown email checks from a requester without creating per-email records', async () => {
    const { t } = await setup();
    for (let i = 0; i < 20; i++) expect(await t.mutation(api.plannerSignIn.requestCode, { email: `unknown${i}@example.test`, requester, secret })).toBe('denied');
    expect(await t.mutation(api.plannerSignIn.requestCode, { email: 'joshhknott@gmail.com', requester, secret })).toBe('limited');
    expect(await t.run(ctx => ctx.db.query('agentRateLimits').take(50))).toHaveLength(1);
  });
});
