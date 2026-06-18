import { createConvexClient } from './client.js';
import type { FunctionReference } from 'convex/server';

export async function queryPublicConvex<Query extends FunctionReference<'query'>>(
  query: Query,
  args: Query['_args'],
  fallback: Awaited<Query['_returnType']>
): Promise<Awaited<Query['_returnType']>> {
  try {
    const client = createConvexClient();
    return await client.query(query, args);
  } catch (error) {
    console.warn('Public Convex query failed; rendering fallback content.', error);
    return fallback;
  }
}
