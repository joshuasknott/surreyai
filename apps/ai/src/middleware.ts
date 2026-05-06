import { defineMiddleware } from 'astro:middleware';
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { createConvexClient, getSocietyById } from '@surreysocieties/admin';

const SOCIETY_ID = 'ai';
const society = getSocietyById(SOCIETY_ID);

const isPublicAdminRoute = createRouteMatcher([
  '/admin/login',
  '/admin/invite/accept',
]);

export const onRequest = clerkMiddleware(async (auth, context) => {
  const { pathname } = new URL(context.request.url);

  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin') && !pathname.startsWith('/_actions/')) {
    return;
  }

  if (isPublicAdminRoute(context.request)) {
    return;
  }

  const { userId } = auth();

  if (!userId) {
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/_actions/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/admin/login');
  }

  const token = await auth().getToken();
  const client = createConvexClient(token || undefined);

  const membership = await client.query("memberships:getMyMembership", {
    societySlug: SOCIETY_ID,
  });

  if (!membership) {
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/_actions/')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Forbidden: You do not have access to this society\'s admin area.', { status: 403 });
  }

  context.locals.convexClient = client;
  context.locals.user = {
    _id: membership.user._id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
  };
  context.locals.societySlug = SOCIETY_ID;
});
