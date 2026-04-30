export const prerender = false;
import type { APIRoute } from 'astro';
import { deleteCommitteeMember } from '@surreysocieties/admin';

const SOCIETY_ID = 'ai';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const id = formData.get('id')?.toString();

  if (id) {
    deleteCommitteeMember(SOCIETY_ID, id);
  }

  return redirect('/admin/committee?deleted=1');
};
