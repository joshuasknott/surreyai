export type AssistantMessage = { role: "user" | "assistant"; content: string };

// Large enough for the configured conversation limits, bounded before JSON parsing.
const MAX_BODY_BYTES = 128 * 1024;

export async function parseRequestBody(request: Request): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; error: string }
> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, error: "Invalid JSON" };
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: "Request body is too large" };
      }
      text += decoder.decode(value, { stream: true });
    }
    const body: unknown = JSON.parse(text + decoder.decode());
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return { ok: false, status: 400, error: "JSON body must be an object" };
    }
    return { ok: true, body: body as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  } finally {
    reader.releaseLock();
  }
}

export function normalizeMessages(
  value: unknown,
  limits: { maxMessages: number; maxInputChars: number; maxTotalChars: number },
): AssistantMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: AssistantMessage[] = [];
  let totalChars = 0;
  // Keep the latest question when old history exceeds the context budget.
  for (const item of value.slice(-limits.maxMessages).reverse()) {
    if (typeof item !== "object" || item === null) continue;
    const role = item.role;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof item.content !== "string") continue;
    let content = item.content.replace(/\s+/g, " ").trim();
    if (!content) continue;
    if (content.length > limits.maxInputChars) {
      content = content.slice(0, Math.max(0, limits.maxInputChars - 3)).trimEnd() + "...";
    }
    if (totalChars + content.length > limits.maxTotalChars) break;
    messages.push({ role, content });
    totalChars += content.length;
  }
  return messages.reverse();
}
