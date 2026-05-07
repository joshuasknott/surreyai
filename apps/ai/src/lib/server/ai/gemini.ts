import { GoogleGenAI } from "@google/genai";

export type GeminiResponseSchema = Record<string, unknown>;

export type GenerateContentOptions = {
  responseMimeType?: string;
  responseSchema?: GeminiResponseSchema;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

type GeminiGenerateResult = {
  text?: unknown;
};

type GeminiClient = {
  models: {
    generateContent(params: Record<string, unknown>): Promise<GeminiGenerateResult>;
  };
};

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
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 4000;
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === "AI_TIMEOUT";
}

async function withTimeout<T>(
  task: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      task(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function requestContent(
  client: GeminiClient,
  params: Record<string, unknown>,
  timeoutMs: number
): Promise<string | null> {
  const result = await withTimeout(
    () => client.models.generateContent(params),
    timeoutMs
  );
  const text = result.text;
  return typeof text === "string" && text.trim().length > 0 ? text : null;
}

export async function generateContent(
  prompt: string,
  options: GenerateContentOptions = {}
): Promise<string | null> {
  if (!isAIEnabled()) return null;

  const apiKey = env("GEMINI_API_KEY")!;
  const model = getModel();
  const maxTokens = options.maxOutputTokens ?? getMaxTokens();
  const timeoutMs = options.timeoutMs ?? getTimeoutMs();
  const startedAt = Date.now();

  const config: Record<string, unknown> = {
    maxOutputTokens: maxTokens,
  };

  if (options.responseMimeType) {
    config.responseMimeType = options.responseMimeType;
  }

  if (options.responseSchema) {
    config.responseSchema = options.responseSchema;
  }

  const params: Record<string, unknown> = {
    model,
    contents: prompt,
    config,
  };

  try {
    const ai = new GoogleGenAI({ apiKey }) as unknown as GeminiClient;
    return await requestContent(ai, params, timeoutMs);
  } catch (error) {
    if (!options.responseSchema || isTimeoutError(error)) return null;

    const elapsedMs = Date.now() - startedAt;
    const remainingMs = timeoutMs - elapsedMs;
    if (remainingMs < 1000) return null;

    try {
      const ai = new GoogleGenAI({ apiKey }) as unknown as GeminiClient;
      return await requestContent(
        ai,
        {
          model,
          contents: prompt,
          config: { maxOutputTokens: maxTokens },
        },
        remainingMs
      );
    } catch {
      return null;
    }
  }
}
