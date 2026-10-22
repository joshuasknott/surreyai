import { beforeEach, describe, expect, it } from "vitest";
import { pbkdf2Sync } from "node:crypto";
import { createApp, enforceRateLimit } from "./server/app";
import { MemoryStore } from "./server/store";
import { portfolioSchema } from "./shared/portfolio";
import {
  base64url,
  hashPassword,
  hashToken,
  verifyPassword,
} from "./server/security";

const document = portfolioSchema.parse({
  version: 1,
  name: "Amina portfolio",
  templateId: "cobalt",
  profile: {
    name: "Amina Patel",
    headline: "Thoughtful digital work",
    bio: "A student portfolio.",
  },
  theme: {
    background: "#f7f4ee",
    surface: "#ffffff",
    color: "#111111",
    muted: "#6b6964",
    accent: "#234DDF",
    border: "#ded8ce",
    headingFont: "inter",
    bodyFont: "inter",
  },
  sections: [
    {
      id: "hero",
      type: "hero",
      title: "Hello",
      subtitle: "A portfolio",
      body: "A short introduction.",
      layout: "split",
      visible: true,
      style: {
        paddingTop: 80,
        paddingBottom: 80,
        textAlign: "left",
        columns: 2,
        imagePosition: "right",
        imageWidth: 50,
      },
      items: [],
    },
  ],
  seo: { title: "Amina portfolio", description: "Portfolio" },
});
const cookieHeader = (response: Response): string =>
  response.headers.get("set-cookie") ?? "";
const sessionParts = (response: Response) => {
  const header = cookieHeader(response);
  const session = header.match(/ps_session=([^;]+)/)?.[1] ?? "";
  const csrf = header.match(/ps_csrf=([^;]+)/)?.[1] ?? "";
  return {
    cookie: "ps_session=" + session + "; ps_csrf=" + csrf,
    csrf: decodeURIComponent(csrf),
  };
};
async function signup(app: ReturnType<typeof createApp>, email: string) {
  const response = await app.request("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify({
      email,
      name: "Amina Patel",
      password: "correct horse 123",
    }),
  });
  expect(response.status).toBe(201);
  return sessionParts(response);
}
describe("Portfolio Studio API", () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => {
    app = createApp(new MemoryStore());
  });
  it("uses Workers-compatible scrypt hashes and verifies legacy PBKDF2 accounts", async () => {
    const current = await hashPassword("correct horse 123", "current-salt");
    expect(current.startsWith("scrypt-v1$32768$8$3$67108864$")).toBe(true);
    expect(await verifyPassword("correct horse 123", current)).toBe(true);
    expect(await verifyPassword("wrong password", current)).toBe(false);
    const legacyDigest = pbkdf2Sync(
      "legacy password",
      "legacy-salt",
      600_000,
      32,
      "sha256",
    );
    const legacy = `pbkdf2-sha256$600000$legacy-salt$${base64url(new Uint8Array(legacyDigest))}`;
    expect(await verifyPassword("legacy password", legacy)).toBe(true);
    expect(await verifyPassword("wrong password", legacy)).toBe(false);
  });
  it("counts concurrent same-network rate-limit requests atomically up to the cap", async () => {
    const store = new MemoryStore();
    const key = "rate:test:same-eduroam-ip";
    await Promise.all(
      Array.from({ length: 70 }, () =>
        enforceRateLimit(store, key, 120, "rate limited", "rate_limited"),
      ),
    );
    await Promise.all(
      Array.from({ length: 50 }, () =>
        enforceRateLimit(store, key, 120, "rate limited", "rate_limited"),
      ),
    );
    await expect(
      enforceRateLimit(store, key, 120, "rate limited", "rate_limited"),
    ).rejects.toMatchObject({ status: 429 });
    expect(
      (await store.get<{ bucket: number; count: number }>(key))?.count,
    ).toBe(120);
  });
  it("creates a session without exposing a password and logs out", async () => {
    const auth = await signup(app, "amina@example.com");
    const session = await app.request("/api/auth/session", {
      headers: { Cookie: auth.cookie },
    });
    expect((await session.json()).user.email).toBe("amina@example.com");
    const logout = await app.request("/api/auth/logout", {
      method: "POST",
      headers: {
        Cookie: auth.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": auth.csrf,
      },
    });
    expect(logout.status).toBe(200);
    const after = await app.request("/api/auth/session", {
      headers: { Cookie: auth.cookie },
    });
    expect((await after.json()).user).toBeNull();
  });
  it("prevents cross-user access and stale overwrites", async () => {
    const first = await signup(app, "first@example.com");
    const created = await app.request("/api/projects", {
      method: "POST",
      headers: {
        Cookie: first.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": first.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ document }),
    });
    expect(created.status).toBe(201);
    const project = (await created.json()).project;
    const second = await signup(app, "second@example.com");
    const cross = await app.request("/api/projects/" + project.id, {
      headers: { Cookie: second.cookie },
    });
    expect(cross.status).toBe(404);
    const patch = await app.request("/api/projects/" + project.id, {
      method: "PATCH",
      headers: {
        Cookie: first.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": first.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expectedRevision: 1, document }),
    });
    expect(patch.status).toBe(200);
    const stale = await app.request("/api/projects/" + project.id, {
      method: "PATCH",
      headers: {
        Cookie: first.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": first.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expectedRevision: 1, document }),
    });
    expect(stale.status).toBe(409);
  });
  it("claims slugs atomically and publishes an immutable snapshot", async () => {
    const first = await signup(app, "one@example.com");
    const second = await signup(app, "two@example.com");
    const create = async (
      auth: ReturnType<typeof sessionParts>,
      name: string,
    ) =>
      (
        await app.request("/api/projects", {
          method: "POST",
          headers: {
            Cookie: auth.cookie,
            Origin: "http://localhost",
            "X-Portfolio-CSRF": auth.csrf,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, document: { ...document, name } }),
        })
      ).json();
    const one = (await create(first, "One")).project;
    const two = (await create(second, "Two")).project;
    const publish = await app.request("/api/projects/" + one.id + "/publish", {
      method: "POST",
      headers: {
        Cookie: first.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": first.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug: "same-name", expectedRevision: 1 }),
    });
    expect(publish.status).toBe(200);
    const collision = await app.request(
      "/api/projects/" + two.id + "/publish",
      {
        method: "POST",
        headers: {
          Cookie: second.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": second.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug: "same-name", expectedRevision: 1 }),
      },
    );
    expect(collision.status).toBe(409);
    const update = await app.request("/api/projects/" + one.id, {
      method: "PATCH",
      headers: {
        Cookie: first.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": first.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 2,
        document: { ...document, name: "Private draft" },
      }),
    });
    expect(update.status).toBe(200);
    const publicView = await app.request("/api/public/same-name");
    expect(publicView.status).toBe(200);
    expect((await publicView.json()).document.name).toBe("One");
  });
  it("allocates readable automatic addresses and preserves an existing address", async () => {
    const first = await signup(app, "automatic-one@example.com");
    const second = await signup(app, "automatic-two@example.com");
    const create = async (auth: ReturnType<typeof sessionParts>) => {
      const response = await app.request("/api/projects", {
        method: "POST",
        headers: {
          Cookie: auth.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": auth.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document }),
      });
      return (await response.json()).project;
    };
    const one = await create(first);
    const two = await create(second);
    const publish = (
      auth: ReturnType<typeof sessionParts>,
      projectId: string,
      expectedRevision = 1,
    ) =>
      app.request(`/api/projects/${projectId}/publish`, {
        method: "POST",
        headers: {
          Cookie: auth.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": auth.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expectedRevision }),
      });
    const [onePublish, twoPublish] = await Promise.all([
      publish(first, one.id),
      publish(second, two.id),
    ]);
    expect(onePublish.status).toBe(200);
    expect(twoPublish.status).toBe(200);
    const oneSlug = (await onePublish.json()).project.slug;
    const twoSlug = (await twoPublish.json()).project.slug;
    expect([oneSlug, twoSlug].sort()).toEqual(["amina-patel", "amina-patel-2"]);

    const updated = await app.request(`/api/projects/${one.id}`, {
      method: "PATCH",
      headers: {
        Cookie: first.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": first.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 2,
        document: { ...document, name: "Changed draft" },
      }),
    });
    expect(updated.status).toBe(200);
    const republished = await publish(first, one.id, 3);
    expect(republished.status).toBe(200);
    expect((await republished.json()).project.slug).toBe(oneSlug);
  });
  it("falls back to a project-derived address after readable suffixes are full", async () => {
    const store = new MemoryStore();
    app = createApp(store);
    const auth = await signup(app, "automatic-saturated@example.com");
    const created = await app.request("/api/projects", {
      method: "POST",
      headers: {
        Cookie: auth.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": auth.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ document }),
    });
    const project = (await created.json()).project;
    for (let suffix = 0; suffix <= 8; suffix += 1)
      await store.put(
        `slug:${suffix === 0 ? "amina-patel" : `amina-patel-${suffix + 1}`}`,
        {
          projectId: `project-other-${suffix}`,
        },
      );
    const published = await app.request(`/api/projects/${project.id}/publish`, {
      method: "POST",
      headers: {
        Cookie: auth.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": auth.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expectedRevision: 1 }),
    });
    expect(published.status).toBe(200);
    const slug = (await published.json()).project.slug as string;
    expect(slug).toMatch(/^amina-patel-[a-f0-9]{32}$/);
    expect((await app.request(`/api/public/${slug}`)).status).toBe(200);
  });
  it("keeps the winning public mapping when the same project publishes concurrently", async () => {
    const store = new MemoryStore();
    app = createApp(store);
    const auth = await signup(app, "automatic-concurrent@example.com");
    const created = await app.request("/api/projects", {
      method: "POST",
      headers: {
        Cookie: auth.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": auth.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ document }),
    });
    const project = (await created.json()).project;
    const publish = () =>
      app.request(`/api/projects/${project.id}/publish`, {
        method: "POST",
        headers: {
          Cookie: auth.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": auth.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expectedRevision: 1 }),
      });
    const [first, second] = await Promise.all([publish(), publish()]);
    const winner = first.status === 200 ? first : second;
    expect(winner.status).toBe(200);
    const winningSlug = (await winner.json()).project.slug as string;
    expect((await app.request(`/api/public/${winningSlug}`)).status).toBe(200);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
  });
  it("revokes published and custom-domain state when deleting a project", async () => {
    const store = new MemoryStore();
    app = createApp(store);
    const auth = await signup(app, "delete@example.com");
    const created = await app.request("/api/projects", {
      method: "POST",
      headers: {
        Cookie: auth.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": auth.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ document }),
    });
    const project = (await created.json()).project;
    const published = await app.request(`/api/projects/${project.id}/publish`, {
      method: "POST",
      headers: {
        Cookie: auth.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": auth.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug: "delete-me", expectedRevision: 1 }),
    });
    expect(published.status).toBe(200);
    await store.put(`project-domain:${project.id}`, {
      domain: "portfolio.example.com",
    });
    await store.put("managed-domain:portfolio.example.com", {
      version: 1,
      domain: "portfolio.example.com",
      ownerId: (await store.get<any>(`auth:email:delete@example.com`)).id,
      projectId: project.id,
      status: "active",
      verificationToken: "token",
      dns: {
        txtName: "_portfolio-studio.portfolio.example.com",
        txtVerified: true,
        cnameVerified: true,
        checkedAt: new Date().toISOString(),
      },
      providerDomainId: null,
      providerStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastError: null,
    });
    const deleted = await app.request(`/api/projects/${project.id}`, {
      method: "DELETE",
      headers: {
        Cookie: auth.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": auth.csrf,
      },
    });
    expect(deleted.status).toBe(200);
    const stored = await store.get<any>(`project:${project.id}`);
    expect(stored.archived).toBe(true);
    expect(stored.publishedDocument).toBeNull();
    expect(stored.publishedHtml).toBeNull();
    expect(stored.publishedAt).toBeNull();
    expect(stored.slug).toBeNull();
    expect(await store.get(`project-domain:${project.id}`)).toBeNull();
    expect(
      await app
        .request("/api/public/delete-me")
        .then((response) => response.status),
    ).toBe(404);
  });
  it("keeps uploaded media owner-private until the published snapshot references it", async () => {
    const first = await signup(app, "assets-owner@example.com");
    const second = await signup(app, "assets-other@example.com");
    const created = await app.request("/api/projects", {
      method: "POST",
      headers: {
        Cookie: first.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": first.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ document }),
    });
    const project = (await created.json()).project;
    const png = "data:image/png;base64,iVBORw0KGgo=";
    const uploaded = await app.request(`/api/projects/${project.id}/assets`, {
      method: "POST",
      headers: {
        Cookie: first.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": first.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dataUrl: png }),
    });
    expect(uploaded.status).toBe(201);
    const asset = await uploaded.json();
    const privateAsset = await app.request(asset.url, {
      headers: { Cookie: first.cookie },
    });
    expect(privateAsset.status).toBe(200);
    expect(privateAsset.headers.get("content-type")).toBe("image/png");
    expect(privateAsset.headers.get("cache-control")).toBe("private, no-store");
    expect(
      (await app.request(asset.url, { headers: { Cookie: second.cookie } }))
        .status,
    ).toBe(404);
    const withImage = {
      ...document,
      sections: [{ ...document.sections[0], image: asset.url }],
    };
    const saved = await app.request(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: {
        Cookie: first.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": first.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expectedRevision: 1, document: withImage }),
    });
    expect(saved.status).toBe(200);
    const published = await app.request(`/api/projects/${project.id}/publish`, {
      method: "POST",
      headers: {
        Cookie: first.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": first.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug: "asset-portfolio", expectedRevision: 2 }),
    });
    expect(published.status).toBe(200);
    const publicAsset = await app.request(asset.url);
    expect(publicAsset.status).toBe(200);
    expect(publicAsset.headers.get("content-type")).toBe("image/png");
    expect(publicAsset.headers.get("x-content-type-options")).toBe("nosniff");
    expect(publicAsset.headers.get("cache-control")).toContain("max-age=300");
    const unpublish = await app.request(
      `/api/projects/${project.id}/unpublish`,
      {
        method: "POST",
        headers: {
          Cookie: first.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": first.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expectedRevision: 3 }),
      },
    );
    expect(unpublish.status).toBe(200);
    expect((await app.request(asset.url)).status).toBe(404);
  });
  it("rejects mutations without same-origin and csrf headers", async () => {
    const auth = await signup(app, "csrf@example.com");
    const response = await app.request("/api/projects", {
      method: "POST",
      headers: { Cookie: auth.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ document }),
    });
    expect(response.status).toBe(403);
  });
  it("stores BYOK credentials encrypted and only returns capability metadata", async () => {
    const store = new MemoryStore();
    app = createApp(store);
    const auth = await signup(app, "key@example.com");
    const response = await app.request(
      "/api/ai/settings",
      {
        method: "PATCH",
        headers: {
          Cookie: auth.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": auth.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "key",
          provider: "openrouter",
          apiKey: "sk-example-secret-12345",
        }),
      },
      { BYOK_ENCRYPTION_KEY: "test encryption key" },
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.settings).toMatchObject({
      mode: "key",
      provider: "openrouter",
      hasApiKey: true,
    });
    expect(JSON.stringify(payload)).not.toContain("sk-example-secret-12345");
    const stored = await store.list<Record<string, unknown>>("ai:settings:");
    expect(JSON.stringify(stored)).not.toContain("sk-example-secret-12345");
  });
  it("does not carry a BYOK key across providers", async () => {
    const auth = await signup(app, "provider-scope@example.com");
    const headers = {
      Cookie: auth.cookie,
      Origin: "http://localhost",
      "X-Portfolio-CSRF": auth.csrf,
      "Content-Type": "application/json",
    };
    const first = await app.request(
      "/api/ai/settings",
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          mode: "key",
          provider: "openai",
          apiKey: "sk-example-secret-12345",
        }),
      },
      { BYOK_ENCRYPTION_KEY: "test encryption key" },
    );
    expect(first.status).toBe(200);
    const changed = await app.request(
      "/api/ai/settings",
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ mode: "key", provider: "anthropic" }),
      },
      { BYOK_ENCRYPTION_KEY: "test encryption key" },
    );
    expect(changed.status).toBe(200);
    expect((await changed.json()).settings.hasApiKey).toBe(false);
  });
  it("maps low reasoning to supported OpenAI and Gemini transports only", async () => {
    const auth = await signup(app, "reasoning-openai@example.com");
    const headers = {
      Cookie: auth.cookie,
      Origin: "http://localhost",
      "X-Portfolio-CSRF": auth.csrf,
      "Content-Type": "application/json",
    };
    const keyEnv = { BYOK_ENCRYPTION_KEY: "test encryption key" };
    const settings = await app.request(
      "/api/ai/settings",
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          mode: "key",
          provider: "openai",
          apiKey: "sk-reasoning-example-12345",
        }),
      },
      keyEnv,
    );
    expect(settings.status).toBe(200);
    const originalFetch = globalThis.fetch;
    let openAiPayload: Record<string, unknown> | null = null;
    globalThis.fetch = async (_input, init) => {
      openAiPayload = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                changes: [
                  {
                    sectionId: "hero",
                    field: "title",
                    value: "Reasoned heading",
                  },
                ],
                summary: "Updated the heading.",
              }),
            },
          },
        ],
      });
    };
    try {
      const response = await app.request(
        "/api/ai/generate",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            mode: "key",
            provider: "openai",
            model: "gpt-5-mini",
            reasoning: true,
            document,
            prompt: "Rewrite the heading",
            selection: { sectionId: "hero", field: "title" },
          }),
        },
        keyEnv,
      );
      expect(response.status).toBe(200);
      expect(openAiPayload).toMatchObject({
        model: "gpt-5-mini",
        reasoning_effort: "low",
        max_completion_tokens: 4096,
      });
      expect(openAiPayload).not.toHaveProperty("temperature");
      expect(openAiPayload).not.toHaveProperty("max_tokens");
    } finally {
      globalThis.fetch = originalFetch;
    }

    const geminiAuth = await signup(app, "reasoning-gemini@example.com");
    const geminiHeaders = {
      Cookie: geminiAuth.cookie,
      Origin: "http://localhost",
      "X-Portfolio-CSRF": geminiAuth.csrf,
      "Content-Type": "application/json",
    };
    const geminiSettings = await app.request(
      "/api/ai/settings",
      {
        method: "PATCH",
        headers: geminiHeaders,
        body: JSON.stringify({
          mode: "key",
          provider: "gemini",
          apiKey: "gemini-reasoning-example-12345",
        }),
      },
      keyEnv,
    );
    expect(geminiSettings.status).toBe(200);
    let geminiPayload: Record<string, unknown> | null = null;
    globalThis.fetch = async (_input, init) => {
      geminiPayload = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    changes: [
                      {
                        sectionId: "hero",
                        field: "title",
                        value: "Thinking heading",
                      },
                    ],
                    summary: "Updated the heading.",
                  }),
                },
              ],
            },
          },
        ],
      });
    };
    try {
      const response = await app.request(
        "/api/ai/generate",
        {
          method: "POST",
          headers: geminiHeaders,
          body: JSON.stringify({
            mode: "key",
            provider: "gemini",
            model: "gemini-2.5-flash",
            reasoning: true,
            document,
            prompt: "Rewrite the heading",
            selection: { sectionId: "hero", field: "title" },
          }),
        },
        keyEnv,
      );
      const generationConfig = geminiPayload?.generationConfig as
        Record<string, unknown> | undefined;
      expect(response.status).toBe(200);
      expect(generationConfig?.thinkingConfig).toEqual({
        thinkingBudget: 1024,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
  it("supports a one-time recovery code without email delivery", async () => {
    const created = await app.request("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost",
      },
      body: JSON.stringify({
        email: "recover@example.com",
        name: "Recovery User",
        password: "correct horse 123",
      }),
    });
    const createdBody = await created.json();
    expect(created.status).toBe(201);
    expect(typeof createdBody.recoveryCode).toBe("string");
    const reset = await app.request("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost",
      },
      body: JSON.stringify({
        email: "recover@example.com",
        code: createdBody.recoveryCode,
        password: "new secure 456",
      }),
    });
    expect(reset.status).toBe(200);
    const login = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost",
      },
      body: JSON.stringify({
        email: "recover@example.com",
        password: "new secure 456",
      }),
    });
    expect(login.status).toBe(200);
    const replay = await app.request("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost",
      },
      body: JSON.stringify({
        email: "recover@example.com",
        code: createdBody.recoveryCode,
        password: "another secure 789",
      }),
    });
    expect(replay.status).toBe(401);
  });
  it("supports a one-time administrator claim without email-based promotion", async () => {
    const token = "admin-bootstrap-token-" + "x".repeat(32);
    const adminHash = await hashToken(token);
    const first = await signup(app, "bootstrap-one@example.com");
    const claim = await app.request(
      "/api/admin/claim",
      {
        method: "POST",
        headers: {
          Cookie: first.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": first.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      },
      { ADMIN_BOOTSTRAP_HASH: adminHash },
    );
    expect(claim.status).toBe(200);
    expect((await claim.json()).user.isAdmin).toBe(true);
    const replay = await app.request(
      "/api/admin/claim",
      {
        method: "POST",
        headers: {
          Cookie: first.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": first.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      },
      { ADMIN_BOOTSTRAP_HASH: adminHash },
    );
    expect(replay.status).toBe(200); // idempotent for the already-admin account
    const second = await signup(app, "bootstrap-two@example.com");
    const other = await app.request(
      "/api/admin/claim",
      {
        method: "POST",
        headers: {
          Cookie: second.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": second.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      },
      { ADMIN_BOOTSTRAP_HASH: adminHash },
    );
    expect(other.status).toBe(409);
  });
  it("returns effective AI allowance defaults while preserving configured limits", async () => {
    const token = "admin-config-token-" + "x".repeat(32);
    const adminHash = await hashToken(token);
    const auth = await signup(app, "config-admin@example.com");
    const claim = await app.request(
      "/api/admin/claim",
      {
        method: "POST",
        headers: {
          Cookie: auth.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": auth.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      },
      {
        ADMIN_BOOTSTRAP_HASH: adminHash,
        SOCIETY_AI_PROVIDERS: JSON.stringify([
          {
            id: "workers-ai",
            name: "Surrey AI Society AI",
            enabled: true,
            models: ["model"],
            maxInputTokens: 1_111,
            dailyLimit: 7_777,
          },
        ]),
        SOCIETY_AI_MAX_INPUT_TOKENS: "12345",
        SOCIETY_AI_MAX_OUTPUT_TOKENS: "2222",
        SOCIETY_AI_DAILY_NEURONS: "8888",
        SOCIETY_AI_USER_DAILY_NEURONS: "888",
      },
    );
    expect(claim.status).toBe(200);
    const response = await app.request(
      "/api/admin/ai/config",
      { headers: { Cookie: auth.cookie } },
      {
        ADMIN_BOOTSTRAP_HASH: adminHash,
        SOCIETY_AI_PROVIDERS: JSON.stringify([
          {
            id: "workers-ai",
            name: "Surrey AI Society AI",
            enabled: true,
            models: ["model"],
            maxInputTokens: 1_111,
            dailyLimit: 7_777,
          },
        ]),
        SOCIETY_AI_MAX_INPUT_TOKENS: "12345",
        SOCIETY_AI_MAX_OUTPUT_TOKENS: "2222",
        SOCIETY_AI_DAILY_NEURONS: "8888",
        SOCIETY_AI_USER_DAILY_NEURONS: "888",
      },
    );
    expect(response.status).toBe(200);
    const provider = (await response.json()).config.providers[0];
    expect(provider).toMatchObject({
      maxInputTokens: 1_111,
      maxOutputTokens: 2_222,
      dailyLimit: 7_777,
      userDailyLimit: 888,
      inputNeuronsPerMillion: 4_119,
      outputNeuronsPerMillion: 34_868,
    });
  });
  it("uses Society AI automatically for a fresh account and applies selected edits only", async () => {
    const auth = await signup(app, "ai@example.com");
    const settings = await app.request("/api/ai/settings", {
      headers: { Cookie: auth.cookie },
    });
    expect((await settings.json()).settings).toMatchObject({
      mode: "society",
      hasApiKey: false,
    });
    const generated = {
      ...document,
      sections: document.sections.map((section) => ({
        ...section,
        title: "Updated title",
      })),
    };
    const response = await app.request(
      "/api/ai/generate",
      {
        method: "POST",
        headers: {
          Cookie: auth.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": auth.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document,
          prompt: "Rewrite the heading",
          selection: { sectionId: "hero", field: "title" },
        }),
      },
      {
        AI: {
          run: async () => ({
            response: JSON.stringify({
              document: generated,
              summary: "Updated the heading.",
            }),
          }),
        },
      },
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.summary).toBe("Updated the heading.");
    expect(payload.document.sections[0].title).toBe("Updated title");
    expect(payload.document.profile.bio).toBe(document.profile.bio);
  });
  it("merges a compact AI patch only inside the selected field", async () => {
    const auth = await signup(app, "ai-patch@example.com");
    const response = await app.request(
      "/api/ai/generate",
      {
        method: "POST",
        headers: {
          Cookie: auth.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": auth.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document,
          prompt: "Rewrite the heading",
          selection: { sectionId: "hero", field: "title" },
        }),
      },
      {
        AI: {
          run: async (_model: string, input: any) => {
            expect(input.messages[1].content).toContain('"changes"');
            return {
              response: JSON.stringify({
                changes: [
                  {
                    sectionId: "hero",
                    field: "title",
                    value: "A focused new heading",
                  },
                ],
                summary: "Updated the selected heading.",
              }),
            };
          },
        },
      },
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.document.sections[0].title).toBe("A focused new heading");
    expect(payload.document.profile.bio).toBe(document.profile.bio);
  });
  it("does not send inline image bytes to the model and restores image markers", async () => {
    const auth = await signup(app, "ai-image@example.com");
    const imageDocument = {
      ...document,
      profile: {
        ...document.profile,
        photo: "data:image/png;base64,QUJDREVGR0hJSktMTU5PUA==",
      },
    };
    const response = await app.request(
      "/api/ai/generate",
      {
        method: "POST",
        headers: {
          Cookie: auth.cookie,
          Origin: "http://localhost",
          "X-Portfolio-CSRF": auth.csrf,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document: imageDocument,
          prompt: "Keep the image and improve the intro",
        }),
      },
      {
        AI: {
          run: async (_model: string, input: any) => {
            expect(input.messages[1].content).not.toContain(
              "QUJDREVGR0hJSktMTU5PUA==",
            );
            return {
              response: JSON.stringify({
                document: {
                  ...imageDocument,
                  profile: {
                    ...imageDocument.profile,
                    photo: "[existing-image]",
                  },
                },
                summary: "Kept the uploaded image.",
              }),
            };
          },
        },
      },
    );
    expect(response.status).toBe(200);
    expect((await response.json()).document.profile.photo).toBe(
      imageDocument.profile.photo,
    );
  });
  it("rejects disabled models and enforces the per-user society allowance", async () => {
    const auth = await signup(app, "quota@example.com");
    const ai = {
      run: async () => ({
        response: JSON.stringify({ document, summary: "ok" }),
      }),
    };
    const request = (model?: string) =>
      app.request(
        "/api/ai/generate",
        {
          method: "POST",
          headers: {
            Cookie: auth.cookie,
            Origin: "http://localhost",
            "X-Portfolio-CSRF": auth.csrf,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            document,
            prompt: "Make a small edit",
            ...(model ? { model } : {}),
          }),
        },
        {
          AI: ai,
          SOCIETY_AI_USER_DAILY_LIMIT: "300",
          SOCIETY_AI_DAILY_LIMIT: "10000",
        },
      );
    expect((await request("not-enabled")).status).toBe(400);
    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(429);
  });
  it("renders only the published snapshot as escaped public HTML", async () => {
    const auth = await signup(app, "ssr@example.com");
    const unsafe = {
      ...document,
      name: "<script>alert(1)</script>",
      profile: { ...document.profile, name: "<script>alert(1)</script>" },
    };
    const created = await app.request("/api/projects", {
      method: "POST",
      headers: {
        Cookie: auth.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": auth.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ document: unsafe }),
    });
    const project = (await created.json()).project;
    const published = await app.request(`/api/projects/${project.id}/publish`, {
      method: "POST",
      headers: {
        Cookie: auth.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": auth.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug: "safe-portfolio", expectedRevision: 1 }),
    });
    expect(published.status).toBe(200);
    const updated = await app.request(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: {
        Cookie: auth.cookie,
        Origin: "http://localhost",
        "X-Portfolio-CSRF": auth.csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: 2,
        document: { ...unsafe, name: "Private draft" },
      }),
    });
    expect(updated.status).toBe(200);
    const html = await app.request("/p/safe-portfolio");
    const body = await html.text();
    expect(html.status).toBe(200);
    expect(body).toContain("pf-template-cobalt");
    expect(body).toContain('data-template="cobalt"');
    expect(body).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(body).not.toContain("<script>alert(1)</script>");
    expect(body).not.toContain("Private draft");
    expect(body).toContain("portfolio-fonts.css");
    expect(html.headers.get("content-security-policy")).toContain(
      "script-src 'none'",
    );
  });
});
