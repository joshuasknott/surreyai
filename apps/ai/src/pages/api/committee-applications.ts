import type { APIRoute } from 'astro';
import { handleCommitteeApplication } from '../../lib/committeeApplication';

export const prerender = false;
export const POST: APIRoute = ({ request, clientAddress }) => handleCommitteeApplication(request, {
  apiKey: import.meta.env.RESEND_API_KEY,
  fromEmail: import.meta.env.COMMITTEE_FROM_EMAIL,
}, clientAddress);
