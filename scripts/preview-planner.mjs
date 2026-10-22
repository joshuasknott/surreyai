import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { convexToJson } from "convex/values";
import { createServer as createHttpServer } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const DEFAULT_ASTRO_ORIGIN = "http://127.0.0.1:4321";
const DEFAULT_PORT = 4333;

function parseLoopbackUrl(value, label) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(`${label} must be an http loopback URL`);
  }
  url.pathname = url.pathname.replace(/\/$/u, "");
  url.search = "";
  url.hash = "";
  return url;
}

function requestIsLoopback(request) {
  const remote = String(request.socket.remoteAddress || "").replace(/^::ffff:/u, "");
  if (remote && !LOOPBACK_HOSTS.has(remote)) return false;
  const host = String(request.headers.host || "").replace(/:\d+$/u, "");
  if (!LOOPBACK_HOSTS.has(host)) return false;
  for (const header of ["origin", "referer"]) {
    const value = request.headers[header];
    if (!value) continue;
    try {
      if (!LOOPBACK_HOSTS.has(new URL(String(value)).hostname)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function writeJson(response, status, value, origin) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function fixtureScript(token) {
  return `<script data-local-planner-fixture>
(() => {
  const token = ${JSON.stringify(token)};
  const session = { id: "local-preview-session", getToken: async () => token };
  const listeners = [];
  const notify = () => listeners.forEach((listener) => listener({ session: window.Clerk.session }));
  window.Clerk = {
    session,
    load: async () => {},
    addListener: (listener) => { listeners.push(listener); return () => {}; },
    setActive: async () => { window.Clerk.session = session; notify(); },
    signOut: async () => { window.Clerk.session = null; notify(); },
    client: { signIn: {
      create: async () => ({ supportedFirstFactors: [{ strategy: "email_code", emailAddressId: "local-preview" }] }),
      prepareFirstFactor: async () => {},
      attemptFirstFactor: async ({ code }) => {
        if (code !== "123456") throw { errors: [{ code: "form_code_incorrect" }] };
        return { status: "complete", createdSessionId: session.id };
      },
    } },
  };
  const isFixtureClerkScript = (node) => node && node.tagName === "SCRIPT" && String(node.src).includes("fixture.local/npm/@clerk/");
  const appendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function appendLocalClerk(node) {
    if (isFixtureClerkScript(node)) {
      queueMicrotask(() => node.onload?.());
      return node;
    }
    return appendChild.call(this, node);
  };
  const append = Element.prototype.append;
  Element.prototype.append = function appendLocalClerkElement(...nodes) {
    const script = nodes.find(isFixtureClerkScript);
    if (script) {
      queueMicrotask(() => script.onload?.());
      return;
    }
    return append.apply(this, nodes);
  };
  window.__LOCAL_PLANNER_PREVIEW__ = true;
})();
</script>`;
}

function isPlannerPath(pathname) {
  return pathname === "/committee/planner" || pathname.startsWith("/committee/planner/");
}

function rewritePlannerHtml(html, origin, token) {
  let result = html
    .replace(/data-key="[^"]*"/u, `data-key="pk_test_Zml4dHVyZS5sb2NhbA=="`)
    .replace(/data-convex="[^"]*"/u, `data-convex="${origin}"`)
    .replace(/<title>([^<]*)<\/title>/iu, (_match, title) => `<title>${title} (Local preview · sample data)</title>`);
  if (!result.includes("data-local-planner-fixture")) {
    result = result.replace(/<\/head>/iu, `${fixtureScript(token)}</head>`);
  }
  return result;
}

async function proxyAstro(request, response, astroOrigin, previewOrigin, token) {
  const requestUrl = new URL(request.url || "/", previewOrigin);
  const target = new URL(`${requestUrl.pathname}${requestUrl.search}`, astroOrigin);
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value && !["host", "connection", "content-length"].includes(key.toLowerCase())) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  const upstream = await fetch(target, { method: request.method, headers, redirect: "manual" });
  const contentType = upstream.headers.get("content-type") || "";
  const body = Buffer.from(await upstream.arrayBuffer());
  const plannerHtml = isPlannerPath(requestUrl.pathname) && contentType.includes("text/html");
  const output = plannerHtml ? Buffer.from(rewritePlannerHtml(body.toString("utf8"), previewOrigin, token)) : body;
  const responseHeaders = { "Cache-Control": plannerHtml ? "no-store" : (upstream.headers.get("cache-control") || "no-cache") };
  if (contentType) responseHeaders["Content-Type"] = contentType;
  const location = upstream.headers.get("location");
  if (location) {
    try {
      const redirected = new URL(location, astroOrigin);
      if (LOOPBACK_HOSTS.has(redirected.hostname)) responseHeaders.Location = `${previewOrigin}${redirected.pathname}${redirected.search}`;
    } catch { /* Drop malformed upstream redirects in the local proxy. */ }
  }
  response.writeHead(upstream.status, responseHeaders);
  response.end(output);
}

async function start({ astroOrigin = process.env.ASTRO_ORIGIN || DEFAULT_ASTRO_ORIGIN, port = Number(process.env.PLANNER_PREVIEW_PORT || DEFAULT_PORT) } = {}) {
  const astro = parseLoopbackUrl(astroOrigin, "ASTRO_ORIGIN");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Preview port must be between 1 and 65535");
  const previewOrigin = `http://127.0.0.1:${port}`;

  // Vite owns the TS transform and loads the real Convex fixture without a
  // build or generated bundle. Its middleware is intentionally not exposed to
  // non-loopback clients; HTML/assets are fetched from the existing Astro dev
  // server below so that process can continue running independently.
  const vite = await createViteServer({ root: repoRoot, appType: "custom", server: { middlewareMode: true, hmr: false } });
  const backendModule = await vite.ssrLoadModule("/e2e/plannerPreviewBackend.ts");
  const backend = await backendModule.createPreviewBackend({ origin: previewOrigin });
  const websocket = new WebSocketServer({ noServer: true });
  const server = createHttpServer(async (request, response) => {
    if (!requestIsLoopback(request)) return writeJson(response, 403, { error: "Loopback preview only" }, previewOrigin);
    const requestUrl = new URL(request.url || "/", previewOrigin);
    const origin = `${previewOrigin}`;
    try {
      if (request.method === "OPTIONS") return writeJson(response, 204, {}, origin);
      if (requestUrl.pathname === "/api/query" || requestUrl.pathname === "/api/mutation") {
        const auth = String(request.headers.authorization || "");
        if (auth !== `Bearer ${backend.token}`) return writeJson(response, 401, { status: "error", errorMessage: "Local preview authentication required" }, origin);
        const body = await readJson(request);
        const kind = requestUrl.pathname.endsWith("/mutation") ? "mutation" : "query";
        const value = await backend.handleConvex(kind, body);
        return writeJson(response, 200, { status: "success", value: convexToJson(value), logLines: [] }, origin);
      }
      if (requestUrl.pathname === "/api/programme" && request.method === "GET") {
        const value = await backend.invoke("query", "planner:listPublished", {});
        return writeJson(response, 200, value, origin);
      }
      if (requestUrl.pathname === "/api/planner/sign-in" && request.method === "POST") {
        await readJson(request);
        return writeJson(response, 200, { allowed: true }, origin);
      }
      if (requestUrl.pathname === "/api/planner/access" && request.method === "POST") {
        const auth = String(request.headers.authorization || "");
        if (auth !== `Bearer ${backend.token}`) return writeJson(response, 401, { error: "Local preview authentication required" }, origin);
        const body = await readJson(request);
        await backend.invoke("mutation", "planner:setAccess", { email: String(body.email || ""), active: true });
        return writeJson(response, 200, { success: true }, origin);
      }
      if (requestUrl.pathname === "/api/planner/draft") {
        return writeJson(response, 501, { error: "AI writing is disabled in the local preview." }, origin);
      }
      if (requestUrl.pathname.startsWith("/api/")) {
        return writeJson(response, 404, { error: "This local preview endpoint is unavailable." }, origin);
      }
      return await proxyAstro(request, response, astro, previewOrigin, backend.token);
    } catch (error) {
      return writeJson(response, 500, { error: error instanceof Error ? error.message : "Local preview request failed" }, origin);
    }
  });

  server.on("upgrade", (request, socket, head) => {
    if (!requestIsLoopback(request)) return socket.destroy();
    const path = new URL(request.url || "/", previewOrigin).pathname;
    if (!/^\/api\/[^/]+\/sync$/u.test(path)) return socket.destroy();
    websocket.handleUpgrade(request, socket, head, (client) => { void backend.registerSocket(client); });
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, "127.0.0.1", resolveListen);
  });
  const close = async () => {
    websocket.close();
    await backend.close();
    await new Promise((resolveClose) => server.close(() => resolveClose()));
    await vite.close();
  };
  return { origin: previewOrigin, astroOrigin: astro.toString(), close, backend };
}

export { start };

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  start().then(({ origin }) => {
    console.log(`Local planner preview: ${origin}/committee/planner`);
    console.log(`Nested workspaces: ${origin}/committee/planner/events · ${origin}/committee/planner/outreach · ${origin}/committee/planner/hack2027`);
    console.log("Data is in-memory and resets when this process stops.");
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
