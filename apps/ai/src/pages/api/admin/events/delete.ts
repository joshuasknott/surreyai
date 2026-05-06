export const prerender = false;
import type { APIRoute } from 'astro';
import { createConvexClient } from '@surreysocieties/admin';

const SOCIETY_ID = 'ai';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const client = locals.convexClient;
  if (!client) return redirect('/admin/login');

  const formData = await request.formData();
  const id = formData.get('id')?.toString();

  if (id) {
    await client.mutation("events:remove", {
      societySlug: SOCIETY_ID,
      eventId: id as any,
    });
  }

  return redirect('/admin/events?deleted=1');
};
