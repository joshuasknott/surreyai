import { describe, expect, it, vi } from 'vitest';
import { ensurePlannerAccount } from './plannerAccounts';

const existing = [{ id: 'user_existing', email_addresses: [{ email_address: 'committee@example.test' }] }];
describe('committee sign-in account preparation', () => {
  it('reuses an existing matching email without creating or emailing another account', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(existing));
    await ensurePlannerAccount('committee@example.test', 'server-secret', request);
    expect(request).toHaveBeenCalledTimes(1);
    expect(new URL(String(request.mock.calls[0][0])).searchParams.get('email_address[]')).toBe('committee@example.test');
  });
  it('reserves a new email without a password, invitation or premature verification', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(Response.json({ id: 'user_new' }));
    await ensurePlannerAccount('committee@example.test', 'server-secret', request);
    expect(request).toHaveBeenCalledTimes(2);
    expect(JSON.parse(request.mock.calls[1][1]!.body as string)).toEqual({ email_address: ['committee@example.test'], email_address_identification_status: ['reserved'], skip_password_requirement: true });
  });
  it('fails closed when the provider cannot check an existing account', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
    await expect(ensurePlannerAccount('committee@example.test', 'server-secret', request)).rejects.toThrow('Could not check');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('only treats a creation conflict as success when a matching account now exists', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(new Response('', { status: 422 })).mockResolvedValueOnce(Response.json(existing));
    await ensurePlannerAccount('committee@example.test', 'server-secret', request);
    expect(request).toHaveBeenCalledTimes(3);
    const failed = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(new Response('', { status: 422 })).mockResolvedValueOnce(Response.json([]));
    await expect(ensurePlannerAccount('committee@example.test', 'server-secret', failed)).rejects.toThrow('Access was not added');
  });
});
