import { test, expect, request as requestFactory } from "@playwright/test";
import { templates } from "../../src/data/templates";

const origin = "http://127.0.0.1:8788";
const authHeaders = { Origin: origin, "Content-Type": "application/json" };

async function mapBounded<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const index = cursor++;
        if (index >= items.length) return;
        try {
          results[index] = {
            status: "fulfilled",
            value: await worker(items[index], index),
          };
        } catch (reason) {
          results[index] = { status: "rejected", reason };
        }
      }
    }),
  );
  return results;
}

test("70 independent users sustain concurrent authenticated reads and saves", async () => {
  test.setTimeout(180_000);
  const indexes = Array.from({ length: 70 }, (_, index) => index);
  type Session = {
    context: Awaited<ReturnType<typeof requestFactory.newContext>>;
    projectId: string;
    csrf: string;
  };
  const sessions: Session[] = [];
  const setup = await mapBounded(indexes, 5, async (index) => {
    const context = await requestFactory.newContext({ baseURL: origin });
    try {
      const email = `load-qa-${Date.now()}-${index}@example.com`;
      const password = "Load QA password 2026!";
      const signup = await context.post("/api/auth/signup", {
        headers: authHeaders,
        data: { name: `Load QA ${index}`, email, password },
      });
      expect(signup.ok()).toBeTruthy();
      const state = await context.storageState();
      const csrf = decodeURIComponent(
        state.cookies.find((cookie) => cookie.name === "ps_csrf")?.value || "",
      );
      expect(csrf).toBeTruthy();
      const document = structuredClone(templates[0].document);
      document.name = `Load QA portfolio ${index}`;
      document.profile.name = `Load QA ${index}`;
      const created = await context.post("/api/projects", {
        headers: { ...authHeaders, "X-Portfolio-CSRF": csrf },
        data: { name: document.name, document, aiMode: "society" },
      });
      expect(created.ok()).toBeTruthy();
      const projectId = ((await created.json()) as { project: { id: string } })
        .project.id;
      return { context, projectId, csrf };
    } catch (error) {
      await context.dispose();
      throw error;
    }
  });
  const setupFailures = setup.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  sessions.push(
    ...setup
      .filter(
        (result): result is PromiseFulfilledResult<Session> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value),
  );
  try {
    expect(
      setupFailures,
      setupFailures.map((failure) => String(failure.reason)).join("\n"),
    ).toHaveLength(0);

    const readStarted = performance.now();
    const reads = await Promise.all(
      sessions.map(async (session) => {
        const at = performance.now();
        const response = await session.context.get(
          `/api/projects/${session.projectId}`,
          { headers: { Origin: origin } },
        );
        return { ok: response.ok(), ms: performance.now() - at };
      }),
    );
    const readElapsed = performance.now() - readStarted;
    const readDurations = reads
      .map((result) => result.ms)
      .sort((a, b) => a - b);
    const readP95 = readDurations[Math.ceil(readDurations.length * 0.95) - 1];
    const readFailures = reads.filter((result) => !result.ok).length;

    const saveStarted = performance.now();
    const saves = await Promise.all(
      sessions.map(async (session, index) => {
        const projectResponse = await session.context.get(
          `/api/projects/${session.projectId}`,
          { headers: { Origin: origin } },
        );
        const project = (
          (await projectResponse.json()) as {
            project: {
              revision: number;
              document: (typeof templates)[number]["document"];
              name: string;
              aiMode: string;
            };
          }
        ).project;
        const document = {
          ...project.document,
          name: `Load QA saved ${index}`,
          profile: {
            ...project.document.profile,
            name: `Load QA saved ${index}`,
          },
        };
        const response = await session.context.patch(
          `/api/projects/${session.projectId}`,
          {
            headers: { ...authHeaders, "X-Portfolio-CSRF": session.csrf },
            data: {
              name: document.name,
              document,
              aiMode: project.aiMode,
              expectedRevision: project.revision,
            },
          },
        );
        return response.ok();
      }),
    );
    const saveElapsed = performance.now() - saveStarted;
    const saveFailures = saves.filter((ok) => !ok).length;
    console.log(
      `70-user-load users=${sessions.length} readFailures=${readFailures} readP95=${readP95.toFixed(1)}ms readTotal=${readElapsed.toFixed(1)}ms saveFailures=${saveFailures} saveTotal=${saveElapsed.toFixed(1)}ms`,
    );
    expect(readFailures).toBe(0);
    expect(saveFailures).toBe(0);
    expect(readP95).toBeLessThan(5_000);
  } finally {
    await mapBounded(sessions, 5, async (session) => {
      await session.context
        .delete(`/api/projects/${session.projectId}`, {
          headers: { ...authHeaders, "X-Portfolio-CSRF": session.csrf },
        })
        .catch(() => {});
      await session.context
        .post("/api/auth/logout", {
          headers: { ...authHeaders, "X-Portfolio-CSRF": session.csrf },
        })
        .catch(() => {});
      await session.context.dispose();
    });
  }
});
