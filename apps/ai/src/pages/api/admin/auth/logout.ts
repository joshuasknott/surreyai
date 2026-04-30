export const prerender = false;
import type { APIRoute } from 'astro';
import { logout, SESSION_COOKIE_NAME } from '@surreysocieties/admin';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const sessionId = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    logout(sessionId);
  }
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
  return redirect('/admin/login');
};
