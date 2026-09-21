import type { APIRoute } from 'astro';
import { handleContactRequest } from '@surreysocieties/admin/contact';
export const prerender = false;
export const POST: APIRoute = ({ request, clientAddress }) => handleContactRequest(request, 'ai', {
  apiKey: import.meta.env.RESEND_API_KEY,
  fromEmail: import.meta.env.CONTACT_FROM_EMAIL,
}, clientAddress);
