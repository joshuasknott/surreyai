import { createConvexClient } from './client.js';

export async function queryPublicConvex<T>(queryName: string, args: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    const client = createConvexClient();
    return (await client.query(queryName, args)) as T;
  } catch (error) {
    console.warn(`Public Convex query failed (${queryName}); rendering fallback content.`, error);
    return fallback;
  }
}
