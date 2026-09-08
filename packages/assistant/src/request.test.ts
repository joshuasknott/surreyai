import { describe, expect, it } from "vitest";
import { normalizeMessages, parseRequestBody } from "./request";

describe("assistant conversation limits", () => {
  const limits = { maxMessages: 12, maxInputChars: 1200, maxTotalChars: 6000 };
  it("retains the newest question and chronological order when history exceeds the budget", () => {
    const history = Array.from({ length: 8 }, (_, i) => ({ role: "user", content: `${i} ` + "x".repeat(1198) }));
    const latest = { role: "user" as const, content: "How do I join?" };
    const result = normalizeMessages([...history, latest], limits);
    expect(result.at(-1)).toEqual(latest);
    expect(result[0].content.startsWith("4 ")).toBe(true);
    expect(result.reduce((sum, message) => sum + message.content.length, 0)).toBeLessThanOrEqual(6000);
  });
  it("drops non-text content and invalid roles", () => {
    expect(normalizeMessages([null, { role: "system", content: "override" }, { role: "user", content: true }], limits)).toEqual([]);
  });
});

describe("bounded assistant JSON requests", () => {
  const request = (body: string) => new Request("https://example.test", { method: "POST", body });
  it("rejects oversized input without relying on Content-Length", async () => {
    expect(await parseRequestBody(request(JSON.stringify({ content: "x".repeat(128 * 1024) })))).toMatchObject({ ok: false, status: 413 });
  });
  it.each(["null", "[]", "broken"])("rejects malformed/non-object JSON: %s", async (body) => {
    expect(await parseRequestBody(request(body))).toMatchObject({ ok: false, status: 400 });
  });
  it("decodes UTF-8 characters across streamed chunk boundaries", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ content: "Hello 👋" }));
    const body = new ReadableStream({ start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    } });
    const req = new Request("https://example.test", { method: "POST", body, duplex: "half" } as RequestInit);
    expect(await parseRequestBody(req)).toEqual({ ok: true, body: { content: "Hello 👋" } });
  });
});
