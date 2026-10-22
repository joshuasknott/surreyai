import { describe, expect, it } from "vitest";
import { MemoryStore } from "../server/store";
import {
  DomainError,
  DomainService,
  normalizeManagedDomain,
} from "../server/domains";

const config = {
  accountId: "account",
  projectName: "portfolio-studio",
  projectSubdomain: "portfolio-studio-1uu.pages.dev",
  apiToken: "kept-out-of-logs",
};

describe("managed custom domains", () => {
  it("accepts normalized subdomains and rejects root domains", () => {
    expect(normalizeManagedDomain(" Portfolio.Example.com. ")).toBe(
      "portfolio.example.com",
    );
    expect(() => normalizeManagedDomain("example.com")).toThrowError(
      DomainError,
    );
    expect(() =>
      normalizeManagedDomain("https://portfolio.example.com/path"),
    ).toThrowError(DomainError);
  });

  it("requires both TXT proof and the Pages CNAME before provider registration", async () => {
    const store = new MemoryStore();
    const calls: string[] = [];
    let txtProof = "";
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.includes("dns-query")) {
        const query = new URL(url);
        if (query.searchParams.get("type") === "TXT") {
          return new Response(
            JSON.stringify({
              Answer: txtProof ? [{ data: `"${txtProof}"` }] : [],
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            Answer: [{ data: "portfolio-studio-1uu.pages.dev." }],
          }),
          { status: 200 },
        );
      }
      if (init?.method === "POST")
        return new Response(
          JSON.stringify({
            success: true,
            result: {
              id: "pages-domain-1",
              name: "portfolio.example.com",
              status: "pending",
            },
          }),
          { status: 200 },
        );
      if (init?.method === "DELETE")
        return new Response(JSON.stringify({ success: true, result: null }), {
          status: 200,
        });
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            id: "pages-domain-1",
            name: "portfolio.example.com",
            status: "active",
          },
        }),
        { status: 200 },
      );
    };
    const service = new DomainService(store, { ...config, fetcher });
    const started = await service.begin(
      "user-1",
      "project-1",
      "Portfolio.Example.com",
    );
    expect(started.txtName).toBe("_portfolio-studio.portfolio.example.com");

    const pending = await service.verify("user-1", "project-1");
    expect(pending.domain.status).toBe("pending");
    expect(calls.some((call) => call.startsWith("POST "))).toBe(false);

    txtProof = started.txtValue;
    const attached = await service.verify("user-1", "project-1");
    expect(attached.domain.status).toBe("pending");
    expect(calls.some((call) => call.startsWith("POST "))).toBe(true);

    const active = await service.verify("user-1", "project-1");
    expect(active.domain.status).toBe("active");
    expect(await service.resolveVerified("portfolio.example.com")).toEqual({
      domain: "portfolio.example.com",
      projectId: "project-1",
    });
  });

  it("prevents another owner from claiming a connected domain", async () => {
    const store = new MemoryStore();
    const service = new DomainService(store, config);
    await service.begin("user-1", "project-1", "portfolio.example.com");
    await expect(
      service.begin("user-2", "project-2", "portfolio.example.com"),
    ).rejects.toMatchObject({ code: "domain_taken", status: 409 });
    await expect(service.remove("user-2", "project-1")).rejects.toMatchObject({
      code: "domain_not_found",
      status: 404,
    });
  });

  it("reports the feature as unavailable without an owner configured Pages token", async () => {
    const service = new DomainService(new MemoryStore(), {
      ...config,
      apiToken: undefined,
    });
    expect(service.capabilities()).toEqual({
      enabled: false,
      reason: "missing_pages_api_token",
    });
    await expect(
      service.begin("user-1", "project-1", "portfolio.example.com"),
    ).rejects.toMatchObject({ code: "domains_unavailable", status: 503 });
  });

  it("revokes local serving when provider deletion fails", async () => {
    const store = new MemoryStore();
    let failDelete = false;
    let txtProof = "";
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("dns-query"))
        return new Response(
          JSON.stringify({
            Answer: [
              {
                data: url.includes("type=TXT")
                  ? `"${txtProof}"`
                  : "portfolio-studio-1uu.pages.dev.",
              },
            ],
          }),
          { status: 200 },
        );
      if (init?.method === "POST")
        return new Response(
          JSON.stringify({
            success: true,
            result: {
              id: "provider-domain",
              name: "portfolio.example.com",
              status: "active",
            },
          }),
          { status: 200 },
        );
      if (init?.method === "DELETE" && failDelete)
        return new Response(JSON.stringify({ success: false }), {
          status: 500,
        });
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            id: "provider-domain",
            name: "portfolio.example.com",
            status: "active",
          },
        }),
        { status: 200 },
      );
    };
    const service = new DomainService(store, { ...config, fetcher });
    const started = await service.begin(
      "user-1",
      "project-1",
      "portfolio.example.com",
    );
    txtProof = started.txtValue;
    await service.verify("user-1", "project-1");
    failDelete = true;
    await expect(service.remove("user-1", "project-1")).rejects.toMatchObject({
      code: "pages_domain_unavailable",
    });
    expect(await service.resolveVerified("portfolio.example.com")).toBeNull();
    expect(await service.get("user-1", "project-1")).toBeNull();
    expect(started.domain.status).toBe("pending");
  });
});
