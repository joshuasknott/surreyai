export const prerender = false;
import type { APIRoute } from 'astro';
import { deleteEvent } from '@surreysocieties/admin';

const SOCIETY_ID = 'ai';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const formData = await request.formData();
  const id = formData.get('id')?.toString();

  if (id) {
    deleteEvent(SOCIETY_ID, id);
  }

  return redirect('/admin/events?deleted=1');
};
