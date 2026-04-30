export const prerender = false;
import type { APIRoute } from 'astro';
import { removeAdminAccess } from '@surreysocieties/admin';

const SOCIETY_ID = 'ai';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const userId = formData.get('userId')?.toString();

  if (userId) {
    removeAdminAccess(SOCIETY_ID, userId);
  }

  return redirect('/admin/admins?success=1');
};
