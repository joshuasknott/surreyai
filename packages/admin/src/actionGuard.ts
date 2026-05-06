/**
 * Shared admin action guard. Use inside Astro Action handlers to verify
 * that the caller is an authenticated admin with a valid Convex client.
 *
 * Throws ActionError if the caller is unauthorized.
 */
export interface AdminActionContext {
  locals: {
    convexClient?: any;
    user?: {
      _id: string;
      name: string;
      email: string;
      role: string;
    };
    societySlug?: string;
  };
}

export interface AdminGuardResult {
  client: any;
  user: NonNullable<AdminActionContext['locals']['user']>;
  societySlug: string;
}

/**
 * Ensures the calling context has a valid admin session.
 * Returns the Convex client, user, and society slug.
 * Throws an object with `code` and `message` for ActionError compatibility.
 */
export function requireAdmin(context: AdminActionContext): AdminGuardResult {
  const { convexClient, user, societySlug } = context.locals;

  if (!convexClient || !user) {
    throw { code: 'UNAUTHORIZED', message: 'Authentication required' };
  }

  if (!societySlug) {
    throw { code: 'FORBIDDEN', message: 'Society context missing' };
  }

  return { client: convexClient, user, societySlug };
}

/**
 * Ensures the calling context has admin-level (not just member) privileges.
 * Use for sensitive operations like managing other admins.
 */
export function requireAdminRole(context: AdminActionContext): AdminGuardResult {
  const result = requireAdmin(context);

  if (result.user.role !== 'owner' && result.user.role !== 'protectedAdmin' && result.user.role !== 'admin') {
    throw { code: 'FORBIDDEN', message: 'Admin role required' };
  }

  return result;
}
