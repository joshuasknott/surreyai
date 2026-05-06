import { GoogleGenAI } from "@google/genai";

function env(key: string): string | undefined {
  return process.env[key];
}

export function isAIEnabled(): boolean {
  return env("AI_FEATURES_ENABLED") === "true" && !!env("GEMINI_API_KEY");
}

function getModel(): string {
  return env("AI_MODEL") || "gemini-2.0-flash-lite";
}

function getMaxTokens(): number {
  const raw = env("AI_MAX_OUTPUT_TOKENS");
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 512;
}

function getTimeoutMs(): number {
  const raw = env("AI_TIMEOUT_MS");
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 8000;
}

export async function generateContent(prompt: string): Promise<string | null> {
  if (!isAIEnabled()) return null;

  const apiKey = env("GEMINI_API_KEY")!;
  const model = getModel();
  const maxTokens = getMaxTokens();
  const timeoutMs = getTimeoutMs();

  try {
    const ai = new GoogleGenAI({ apiKey });

    const result = await Promise.race([
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens: maxTokens,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)
      ),
    ]);

    const text = result.text;
    return typeof text === "string" && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
