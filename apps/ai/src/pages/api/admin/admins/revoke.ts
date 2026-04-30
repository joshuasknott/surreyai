export const prerender = false;
import type { APIRoute } from 'astro';
import { revokeInvitation } from '@surreysocieties/admin';

const SOCIETY_ID = 'ai';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const invitationId = formData.get('invitationId')?.toString();

  if (invitationId) {
    revokeInvitation(SOCIETY_ID, invitationId);
  }

  return redirect('/admin/admins?success=1');
};
