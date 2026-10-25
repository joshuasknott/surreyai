import { afterEach, describe, expect, it, vi } from "vitest";
import { getTemplate } from "../src/data/templates";
import { studentProfileSchema } from "../shared/student";
import {
  createDraft,
  getDrafts,
  projectsApi,
  saveDraftToAccount,
} from "../src/lib/api";

afterEach(() => vi.unstubAllGlobals());

describe("cloud project duplication", () => {
  it.each(["read", "write"])(
    "preserves the source draft when brief storage cannot %s during a cloud save",
    async (failure) => {
      const stored = new Map<string, string>();
      vi.stubGlobal("document", { cookie: "" });
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
      });
      vi.stubGlobal("sessionStorage", {
        getItem: () => {
          if (failure === "read")
            throw new Error("Session storage unavailable");
          return JSON.stringify({
            cv: "Imported test CV",
            prompt: "An editorial design",
          });
        },
        setItem: () => {
          throw new Error("Session storage full");
        },
        removeItem: () => {
          throw new Error("The original brief must be preserved");
        },
      });
      const draft = createDraft(
        structuredClone(getTemplate("cobalt").document),
      );
      const cloud = { ...draft, id: "project_saved", revision: 1 };
      const fetchMock = vi.fn(async () => Response.json({ project: cloud }));
      vi.stubGlobal("fetch", fetchMock);

      await expect(saveDraftToAccount(draft)).resolves.toEqual({
        project: cloud,
        draftRetained: true,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(getDrafts()).toEqual([draft]);
    },
  );
  it("copies uploaded media once into the new project so deleting the original cannot break it", async () => {
    vi.stubGlobal("document", { cookie: "" });
    const original = structuredClone(getTemplate("cobalt").document);
    original.profile.photo = "/api/assets/asset_original";
    original.sections[0].image = original.profile.photo;
    original.student = studentProfileSchema.parse({
      name: "Taylor",
      photo: original.profile.photo,
      projects: [
        { id: "work", title: "My work", image: original.profile.photo },
      ],
    });
    const requests: Array<{ path: string; method: string; body: any }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        requests.push({ path: input, method: init?.method || "GET", body });
        if (input === "/api/assets/asset_original")
          return new Response(
            new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
            { headers: { "Content-Type": "image/png" } },
          );
        if (input.endsWith("/assets"))
          return Response.json({ url: "/api/assets/asset_independent" });
        return Response.json({
          project: { id: "project_copy", revision: 0, document: body.document },
        });
      }),
    );
    const { project } = await projectsApi.create(original);
    expect(requests.filter((r) => r.path.endsWith("/assets"))).toHaveLength(1);
    expect(requests[0].body.document.sections[0].image).toBe("");
    expect(project.document.sections[0].image).toBe(
      "/api/assets/asset_independent",
    );
    expect(project.document.profile.photo).toBe(
      "/api/assets/asset_independent",
    );
    expect(original.sections[0].image).toBe("/api/assets/asset_original");
    expect(project.document.student?.photo).toBe(
      "/api/assets/asset_independent",
    );
    expect(project.document.student?.projects[0].image).toBe(
      "/api/assets/asset_independent",
    );
    expect(original.student.projects[0].image).toBe(
      "/api/assets/asset_original",
    );
  });

  it("removes an incomplete copy and preserves its source when an image is unavailable", async () => {
    vi.stubGlobal("document", { cookie: "" });
    const original = structuredClone(getTemplate("cobalt").document);
    original.sections[0].image = "/api/assets/asset_missing";
    const requests: Array<{ path: string; method?: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        requests.push({ path: input, method: init?.method });
        if (input === "/api/assets/asset_missing")
          return new Response("Not found", { status: 404 });
        return Response.json({
          project: { id: "project_incomplete", revision: 0 },
        });
      }),
    );
    await expect(projectsApi.create(original)).rejects.toThrow(
      "image could not be copied",
    );
    expect(requests).toContainEqual({
      path: "/api/projects/project_incomplete",
      method: "DELETE",
    });
    expect(original.sections[0].image).toBe("/api/assets/asset_missing");
  });
});
