export const prerender = false;
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ redirect }) => {
  return redirect('/admin/login');
};
