import type { APIRoute } from 'astro';
import { createConvexClient } from '@surreysocieties/admin';
import { api } from '../../../../../convex/_generated/api';

export const GET: APIRoute = async () => {
  try {
    const activities = await createConvexClient().query(api.planner.listPublished, {});
    return new Response(JSON.stringify(activities), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch { return new Response(JSON.stringify({ error: 'Programme temporarily unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
};
