export const prerender = false;
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ locals }) => {
  const client = locals.convexClient;
  if (!client || !locals.societySlug) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const uploadUrl = await client.mutation('storage:generateUploadUrl', {
      societySlug: locals.societySlug,
    });

    return new Response(JSON.stringify({ uploadUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to generate upload URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
