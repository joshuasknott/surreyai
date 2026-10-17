import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { handleMentionEmail } from '../../lib/plannerMentionEmail';

export const prerender = false;
export const POST: APIRoute = ({ request }) => handleMentionEmail(request, {
  secret: getSecret('PLANNER_EMAIL_SECRET'), apiKey: getSecret('RESEND_API_KEY'), fromEmail: getSecret('COMMITTEE_FROM_EMAIL'),
});
