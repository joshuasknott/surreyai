import { defineMiddleware } from 'astro:middleware';
import { getSession, SESSION_COOKIE_NAME, runMigrations, seedDatabase, canAccessSociety } from '@surreysocieties/admin';

const SOCIETY_ID = 'ai';
let dbInitialized = false;

async function initDb() {
  if (dbInitialized) return;
  try {
    runMigrations();
    await seedDatabase();
    dbInitialized = true;
    console.log(`[middleware:${SOCIETY_ID}] Database initialized`);
  } catch (error) {
    console.error(`[middleware:${SOCIETY_ID}] DB init failed:`, error);
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  await initDb();

  const { pathname } = context.url;

  // Only protect admin routes (not /admin/login or /admin/invite/accept)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !pathname.startsWith('/admin/invite/accept') && !pathname.startsWith('/api/admin/auth')) {
    const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = sessionId ? getSession(sessionId) : null;

    if (!user) {
      return context.redirect('/admin/login');
    }

    // Check society access
    if (!canAccessSociety(user, SOCIETY_ID)) {
      return new Response('Forbidden: You do not have access to this society\'s admin area.', { status: 403 });
    }

    // Store user in locals for pages to use
    context.locals.user = user;
    context.locals.societyId = SOCIETY_ID;
  }

  // For API routes that need auth
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')) {
    const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = sessionId ? getSession(sessionId) : null;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    if (!canAccessSociety(user, SOCIETY_ID)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    context.locals.user = user;
    context.locals.societyId = SOCIETY_ID;
  }

  return next();
});
