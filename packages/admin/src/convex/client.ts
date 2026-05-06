import { ConvexHttpClient } from "convex/browser";

function getConvexUrl(): string {
  const metaEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;

  return metaEnv?.CONVEX_URL || process.env.CONVEX_URL || "";
}

export function createConvexClient(authToken?: string): ConvexHttpClient {
  const convexUrl = getConvexUrl();
  if (!convexUrl) throw new Error("CONVEX_URL is not set");
  const client = new ConvexHttpClient(convexUrl);
  if (authToken) {
    client.setAuth(authToken);
  }
  return client;
}
