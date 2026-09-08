import { afterEach, describe, expect, it } from "vitest";
import { handleAssistantChatRequest } from "./server";

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.AI_FEATURES_ENABLED;
});

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/assistant/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("website assistant safeguards", () => {
  it("rejects unsupported methods and content types", async () => {
    const getResponse = await handleAssistantChatRequest(
      new Request("https://example.test/api/assistant/chat", { method: "GET" }),
      "ai"
    );
    const textResponse = await handleAssistantChatRequest(
      new Request("https://example.test/api/assistant/chat", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "hello",
      }),
      "ai"
    );

    expect(getResponse.status).toBe(405);
    expect(textResponse.status).toBe(415);
  });

  it("rejects requests without a usable user message", async () => {
    const response = await handleAssistantChatRequest(request({ messages: [] }), "business");
    expect(response.status).toBe(400);
  });

  it("rejects assistant-only conversations and lookalike JSON content types", async () => {
    const assistantOnly = await handleAssistantChatRequest(request({ messages: [{ role: "assistant", content: "Hello" }] }), "business");
    expect(assistantOnly.status).toBe(400);
    const invalidType = await handleAssistantChatRequest(request({ messages: [{ role: "user", content: "Hello" }] }, { "content-type": "application/json-invalid" }), "business");
    expect(invalidType.status).toBe(415);
  });

  it("answers the latest question when older messages exceed the context budget", async () => {
    const messages = Array.from({ length: 8 }, () => ({ role: "user", content: "x".repeat(1200) }));
    messages.push({ role: "user", content: "How do I join?" });
    const response = await handleAssistantChatRequest(request({ messages }, { "x-forwarded-for": "198.51.100.19" }), "business");
    expect(response.status).toBe(200);
    expect((await response.json()).message).toContain("Membership");
  });

  it("rejects oversized JSON before accessing public context", async () => {
    const response = await handleAssistantChatRequest(request({ messages: [], padding: "x".repeat(128 * 1024) }), "business");
    expect(response.status).toBe(413);
  });

  it("returns a safe local fallback when generative AI is disabled", async () => {
    const response = await handleAssistantChatRequest(
      request(
        { messages: [{ role: "user", content: "hello" }] },
        { "x-forwarded-for": "198.51.100.8" }
      ),
      "neurotech"
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("fallback");
    expect(body.message).toContain("verified public website context");
  });

  it("rate limits repeated fallback requests from the same address", async () => {
    let response: Response | undefined;
    for (let index = 0; index < 25; index += 1) {
      response = await handleAssistantChatRequest(
        request(
          { messages: [{ role: "user", content: "hello" }] },
          { "x-forwarded-for": "203.0.113.55" }
        ),
        "ai"
      );
    }

    expect(response?.status).toBe(429);
  });
});
