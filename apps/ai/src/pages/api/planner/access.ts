import type { APIRoute } from 'astro';
import { createConvexClient } from '@surreysocieties/admin';
import { api } from '../../../../../../convex/_generated/api';
import { ensurePlannerAccount } from '../../../lib/server/plannerAccounts';

export const prerender = false;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request, url }) => {
  if (request.headers.get('origin') && request.headers.get('origin') !== url.origin) return json({ error: 'Use the planner settings to add committee emails.' }, 403);
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return json({ error: 'Owner sign-in required.' }, 401);
  const client = createConvexClient(token);
  try { if (!(await client.query(api.planner.access, {}))?.canManageAccess) return json({ error: 'Only the planner owner can add committee emails.' }, 403); }
  catch { return json({ error: 'Could not verify owner access. Sign in again.' }, 401); }
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Send a JSON email request.' }, 415);
  if (Number(request.headers.get('content-length')) > 1024) return json({ error: 'This request is too large.' }, 413);
  const raw = await request.text();
  if (raw.length > 1024) return json({ error: 'This request is too large.' }, 413);
  let email: string;
  try { const body = JSON.parse(raw); email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''; }
  catch { return json({ error: 'Enter a valid committee email.' }, 400); }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid committee email.' }, 400);
  const secret = process.env.CLERK_SECRET_KEY || import.meta.env.CLERK_SECRET_KEY;
  if (!secret || !/^sk_(test|live)_/.test(secret)) return json({ error: 'Email sign-in setup is unavailable. Please try again later.' }, 503);
  try {
    await ensurePlannerAccount(email, secret);
    // Convex checks the authenticated owner again before changing any access.
    await client.mutation(api.planner.setAccess, { email, active: true });
    return json({ success: true });
  } catch { return json({ error: 'Could not add this email. Try again; repeating an addition is safe.' }, 502); }
};
