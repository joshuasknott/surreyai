import type { APIRoute } from 'astro';
import { createHmac } from 'node:crypto';
import { createConvexClient } from '@surreysocieties/admin';
import { api } from '../../../../../../convex/_generated/api';

export const prerender = false;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (request.headers.get('origin') !== url.origin) return json({ error: 'Use the committee sign-in page to request a code.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Send a JSON email request.' }, 415);
  if (Number(request.headers.get('content-length')) > 1024) return json({ error: 'This request is too large.' }, 413);
  const raw = await request.text();
  if (raw.length > 1024) return json({ error: 'This request is too large.' }, 413);
  let email: string;
  try { const body = JSON.parse(raw); email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''; }
  catch { return json({ error: 'Enter a valid email address.' }, 400); }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
  const secret = process.env.PLANNER_SIGN_IN_SECRET || import.meta.env.PLANNER_SIGN_IN_SECRET;
  if (!secret || secret.length < 32) return json({ error: 'Sign-in is temporarily unavailable. Please try again later.' }, 503);
  try {
    // Retain no raw IP address in the rate-limit records.
    const requester = createHmac('sha256', secret).update(clientAddress || 'unknown').digest('hex');
    const result = await createConvexClient().mutation(api.plannerSignIn.requestCode, { email, requester, secret });
    if (result === 'limited') return json({ error: 'Too many code requests. Wait a few minutes and try again.' }, 429);
    if (result !== 'allowed') return json({ error: 'This email has not been granted committee access. Ask Josh to add it.' }, 403);
    return json({ allowed: true });
  } catch { return json({ error: 'Could not check committee access. Please try again.' }, 503); }
};
