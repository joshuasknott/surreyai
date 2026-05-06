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
  const invitationId = formData.get('invitationId')?.toString();

  if (invitationId) {
    await client.mutation("memberships:revokeInvitation", {
      societySlug: SOCIETY_ID,
      invitationId: invitationId as any,
    });
  }

  return redirect('/admin/admins?success=1');
};
