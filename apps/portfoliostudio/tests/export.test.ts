import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { portfolioSchema } from "../shared/portfolio";
import { getTemplate } from "../src/data/templates";
import { exportPortfolioSite, exportPortfolioSource } from "../src/lib/export";

describe("portfolio exports", () => {
  it("creates an offline website archive with local image URLs and a round-trippable document", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/fonts/"))
          return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          status: 200,
          headers: { "content-type": "image/png", "content-length": "4" },
        });
      }),
    );
    const document = getTemplate("cobalt").document;
    const archive = await JSZip.loadAsync(
      await (await exportPortfolioSite(document)).arrayBuffer(),
    );
    const html = await archive.file("index.html")?.async("string");
    const json = await archive.file("portfolio.json")?.async("string");
    expect(html).toContain("./images/image-1.png");
    expect(html).not.toContain("images.unsplash.com");
    expect(html).toContain("assets/portfolio.css");
    expect(json).toBeTruthy();
    expect(() => portfolioSchema.parse(JSON.parse(json || "{}"))).not.toThrow();
    expect(archive.file("fonts/fonts.css")).toBeTruthy();
    expect(archive.file("fonts/OFL.txt")).toBeTruthy();
    expect(archive.file("export-manifest.json")).toBeTruthy();
    expect(archive.file("README.md")).toBeTruthy();
    const source = await exportPortfolioSource(document);
    const sourceArchive = await JSZip.loadAsync(await source.arrayBuffer());
    expect(sourceArchive.file("studio-export.json")).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it("keeps blocked image URLs documented instead of silently dropping them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/fonts/"))
          return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
        return new Response("blocked", { status: 403 });
      }),
    );
    const archive = await JSZip.loadAsync(
      await (
        await exportPortfolioSite(getTemplate("cobalt").document)
      ).arrayBuffer(),
    );
    const manifest = JSON.parse(
      (await archive.file("export-manifest.json")?.async("string")) || "{}",
    ) as { missingImages?: string[] };
    expect(manifest.missingImages?.length).toBeGreaterThan(0);
    expect(await archive.file("README.md")?.async("string")).toContain(
      "Asset notes",
    );
    vi.unstubAllGlobals();
  });

  it("keeps canonical CV facts out of the public site export", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/fonts/"))
          return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }),
    );
    const document = structuredClone(getTemplate("cobalt").document);
    document.student = {
      version: 1,
      name: "Private Student",
      headline: "Private CV facts",
      bio: "Do not publish this summary.",
      location: "Guildford",
      email: "private@example.com",
      photo: "",
      links: [],
      education: [],
      experience: [],
      projects: [],
      volunteering: [],
      skills: [],
      interests: [],
      achievements: [],
    };
    document.sections[1].visible = false;
    const archive = await JSZip.loadAsync(
      await (await exportPortfolioSite(document)).arrayBuffer(),
    );
    const json = await archive.file("portfolio.json")?.async("string");
    const html = await archive.file("index.html")?.async("string");
    expect(json).not.toContain("Private CV facts");
    expect(html).not.toContain("Do not publish this summary.");
    expect(html).not.toContain("Selected work");
    vi.unstubAllGlobals();
  });

  it("fails clearly when a bundled font cannot be downloaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("missing", { status: 404 })),
    );
    await expect(
      exportPortfolioSite(getTemplate("cobalt").document),
    ).rejects.toThrow("font for export");
    vi.unstubAllGlobals();
  });

  it("embeds uploaded private media in editable JSON and preserves non-image links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/fonts/"))
          return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }),
    );
    const original = getTemplate("cobalt").document;
    const document = {
      ...original,
      profile: { ...original.profile, photo: "/api/assets/private-1" },
    };
    const archive = await JSZip.loadAsync(
      await (await exportPortfolioSource(document)).arrayBuffer(),
    );
    const json = JSON.parse(
      (await archive.file("portfolio.json")?.async("string")) || "{}",
    ) as typeof document;
    expect(json.profile.photo).toMatch(/^data:image\/png;base64,/);
    expect(json.profile.links).toEqual(original.profile.links);
    expect(() => portfolioSchema.parse(json)).not.toThrow();
    expect(
      JSON.parse(
        (await archive.file("export-manifest.json")?.async("string")) || "{}",
      ).images[0].embeddedInDocument,
    ).toBe(true);
    vi.unstubAllGlobals();
  });

  it("fails instead of exporting a private URL when an uploaded asset is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/fonts/"))
          return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
        return new Response("private asset unavailable", { status: 404 });
      }),
    );
    const original = getTemplate("cobalt").document;
    const document = {
      ...original,
      profile: { ...original.profile, photo: "/api/assets/private-2" },
    };
    await expect(exportPortfolioSite(document)).rejects.toThrow(
      "uploaded image",
    );
    vi.unstubAllGlobals();
  });
});
