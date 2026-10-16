import { getSecret } from 'astro:env/server';
import type { APIRoute } from 'astro';
import { handleCommitteeUpload } from '../../lib/committeeUpload';

export const prerender = false;
export const POST: APIRoute = ({ request, clientAddress }) => handleCommitteeUpload(request, {
  token: getSecret('BLOB_READ_WRITE_TOKEN'),
  deliveryReady: Boolean(getSecret('RESEND_API_KEY') && (getSecret('COMMITTEE_FROM_EMAIL') || getSecret('CONTACT_FROM_EMAIL'))),
}, clientAddress);
