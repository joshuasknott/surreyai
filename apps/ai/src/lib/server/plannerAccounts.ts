/** Prepare an email-only Clerk account without sending invitations or passwords.
 * Reserved emails are verified by Clerk when their owner signs in. */
export async function ensurePlannerAccount(email: string, secret: string, request: typeof fetch = fetch): Promise<void> {
  const headers = { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
  const lookup = new URL('https://api.clerk.com/v1/users');
  lookup.searchParams.set('email_address[]', email); lookup.searchParams.set('limit', '1');
  async function exists() {
    const response = await request(lookup, { headers, signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error('Could not check this sign-in account. Try again.');
    const users: unknown = await response.json();
    if (!Array.isArray(users)) throw new Error('Could not check this sign-in account. Try again.');
    return users.some(user => user && typeof user.id === 'string' && Array.isArray(user.email_addresses) &&
      user.email_addresses.some((address: { email_address?: string }) => address.email_address?.toLowerCase() === email));
  }
  if (await exists()) return;
  const response = await request('https://api.clerk.com/v1/users', { method: 'POST', headers,
    body: JSON.stringify({ email_address: [email], email_address_identification_status: ['reserved'], skip_password_requirement: true }), signal: AbortSignal.timeout(6000) });
  if (response.ok) return;
  // Concurrent additions can race at Clerk's unique email constraint.
  if (response.status === 422 && await exists()) return;
  throw new Error('Could not prepare this email for sign-in. Access was not added. Try again.');
}
