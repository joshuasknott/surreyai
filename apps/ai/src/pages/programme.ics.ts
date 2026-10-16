import type { APIRoute } from 'astro';
import { createConvexClient } from '@surreysocieties/admin';
import { api } from '../../../../convex/_generated/api';
import { calendarFeed } from '../lib/calendarFeed';

export const GET: APIRoute = async ({ url }) => {
  try {
    const activities = await createConvexClient().query(api.planner.listPublished, {});
    const id = url.searchParams.get('id');
    const selected = id ? activities.filter(item => item.id === id) : activities;
    if (id && !selected.length) return new Response('Activity not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    return new Response(calendarFeed(selected, 'https://surreyaisociety.org'), { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="surrey-ai-programme.ics"', 'Cache-Control': 'no-store' } });
  } catch { return new Response('Calendar temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
};
