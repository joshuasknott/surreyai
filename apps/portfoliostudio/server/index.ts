import { createApp } from "./app";
import { D1Store, ensureD1Schema, type D1DatabaseLike } from "./store";
import { DomainService, type DomainConfig } from "./domains";
import { publicSecurityHeaders, renderPublicPortfolio } from "./ssr";
import { AssetService } from "./assets";

type WorkerEnv = {
  DB: D1DatabaseLike;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  ADMIN_USER_IDS?: string;
  ADMIN_BOOTSTRAP_HASH?: string;
  PUBLIC_APP_URL?: string;
  APP_ORIGIN?: string;
  BYOK_ENCRYPTION_KEY?: string;
  SOCIETY_AI_PROVIDERS?: string;
  SOCIETY_AI_DAILY_NEURONS?: string;
  SOCIETY_AI_USER_DAILY_NEURONS?: string;
  SOCIETY_AI_MAX_INPUT_TOKENS?: string;
  SOCIETY_AI_MAX_OUTPUT_TOKENS?: string;
  SOCIETY_AI_DAILY_LIMIT?: string;
  SOCIETY_AI_USER_DAILY_LIMIT?: string;
  SOCIETY_AI_MAX_TOKENS?: string;
  PAGES_ACCOUNT_ID?: string;
  PAGES_PROJECT_NAME?: string;
  PAGES_PROJECT_SUBDOMAIN?: string;
  PAGES_API_TOKEN?: string;
  AI?: unknown;
};
type ExecutionContextLike = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
  props: unknown;
};

let app: ReturnType<typeof createApp> | undefined;
let schemaReady: Promise<void> | undefined;

function responseNotFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Cloudflare Worker entry point. The app itself remains portable for tests. */
export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    executionContext: ExecutionContextLike,
  ): Promise<Response> {
    if (!schemaReady) schemaReady = ensureD1Schema(env.DB);
    await schemaReady;
    if (!app) app = createApp(new D1Store(env.DB));
    const url = new URL(request.url);
    const configuredOrigin = env.APP_ORIGIN ?? env.PUBLIC_APP_URL;
    let studioHost = url.hostname;
    try {
      if (configuredOrigin) studioHost = new URL(configuredOrigin).hostname;
    } catch {
      /* invalid optional config falls back to request host */
    }
    if (url.hostname !== studioHost) {
      if (url.pathname.startsWith("/api/assets/")) {
        if (request.method !== "GET" && request.method !== "HEAD")
          return responseNotFound();
        const assetId = url.pathname.slice("/api/assets/".length);
        if (!assetId || assetId.includes("/")) return responseNotFound();
        const config: DomainConfig = {
          accountId: env.PAGES_ACCOUNT_ID,
          projectName: env.PAGES_PROJECT_NAME,
          projectSubdomain: env.PAGES_PROJECT_SUBDOMAIN,
          apiToken: env.PAGES_API_TOKEN,
        };
        const resolved = await new DomainService(
          new D1Store(env.DB),
          config,
        ).resolveVerified(url.hostname);
        if (!resolved) return responseNotFound();
        const store = new D1Store(env.DB);
        const project = await store.get<{
          id: string;
          ownerId: string;
          archived?: boolean;
          publishedAt?: string | null;
          publishedDocument?: unknown;
        }>(`project:${resolved.projectId}`);
        const result = await new AssetService(store).read(assetId, {
          publishedProject: project
            ? {
                projectId: project.id,
                ownerId: project.ownerId,
                archived: project.archived,
                publishedAt: project.publishedAt,
                publishedDocument: project.publishedDocument,
              }
            : null,
          verifiedHostProjectId: resolved.projectId,
        });
        if (!result) return responseNotFound();
        return new Response(result.bytes as unknown as BodyInit, {
          headers: {
            "Content-Type": result.contentType,
            "Content-Length": String(result.size),
            ETag: result.etag,
            "Cache-Control": "public, max-age=300, s-maxage=300",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      if (url.pathname.startsWith("/api/")) return responseNotFound();
      if (request.method !== "GET" && request.method !== "HEAD")
        return responseNotFound();
      if (url.pathname === "/") {
        const config: DomainConfig = {
          accountId: env.PAGES_ACCOUNT_ID,
          projectName: env.PAGES_PROJECT_NAME,
          projectSubdomain: env.PAGES_PROJECT_SUBDOMAIN,
          apiToken: env.PAGES_API_TOKEN,
        };
        const resolved = await new DomainService(
          new D1Store(env.DB),
          config,
        ).resolveVerified(url.hostname);
        if (!resolved) return responseNotFound();
        const project = await new D1Store(env.DB).get<{
          name: string;
          archived?: boolean;
          publishedDocument?: import("../shared/portfolio").PortfolioDocument;
          publishedAt?: string;
        }>(`project:${resolved.projectId}`);
        if (
          !project?.publishedDocument ||
          !project.publishedAt ||
          project.archived
        )
          return responseNotFound();
        return new Response(
          renderPublicPortfolio(project.publishedDocument, url.origin + "/"),
          {
            headers: {
              ...publicSecurityHeaders,
              "Cache-Control": "public, max-age=60, s-maxage=300",
            },
          },
        );
      }
      if (
        url.pathname === "/portfolio-fonts.css" ||
        url.pathname.startsWith("/fonts/") ||
        url.pathname.startsWith("/images/")
      )
        return env.ASSETS ? env.ASSETS.fetch(request) : responseNotFound();
      return responseNotFound();
    }
    const response = await app.fetch(request, env as never, executionContext);
    if (
      response.status === 404 &&
      env.ASSETS &&
      !new URL(request.url).pathname.startsWith("/api/") &&
      !new URL(request.url).pathname.startsWith("/p/")
    )
      return env.ASSETS.fetch(request);
    return response;
  },
};
