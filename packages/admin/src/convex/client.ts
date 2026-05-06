import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL || "";

export function createConvexClient(authToken?: string): ConvexHttpClient {
  if (!CONVEX_URL) throw new Error("CONVEX_URL is not set");
  const client = new ConvexHttpClient(CONVEX_URL);
  if (authToken) {
    client.setAuth(async () => authToken);
  }
  return client;
}
