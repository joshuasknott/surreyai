export const prerender = false;
import type { APIRoute } from 'astro';
import { createConvexClient } from '@surreysocieties/admin';

const SOCIETY_ID = 'ai';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const user = locals.user;
  if (!user || (user.role !== 'protectedAdmin' && user.role !== 'admin')) {
    return new Response('Forbidden', { status: 403 });
  }

  const client = locals.convexClient;
  if (!client) return redirect('/admin/login');

  const formData = await request.formData();
  const userId = formData.get('userId')?.toString();

  if (userId) {
    await client.mutation("memberships:removeMember", {
      societySlug: SOCIETY_ID,
      targetUserId: userId as any,
    });
  }

  return redirect('/admin/admins?success=1');
};
