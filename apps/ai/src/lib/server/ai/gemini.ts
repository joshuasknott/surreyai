import { GoogleGenAI } from "@google/genai";

export type GeminiResponseSchema = Record<string, unknown>;

export type GenerateContentOptions = {
  responseMimeType?: string;
  responseSchema?: GeminiResponseSchema;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export const GEMINI_3_FLASH_LITE_MODEL = "gemini-3.1-flash-lite";

type GeminiGenerateResult = {
  text?: unknown;
};

type GeminiClient = {
  models: {
    generateContent(params: Record<string, unknown>): Promise<GeminiGenerateResult>;
  };
};

function env(key: string): string | undefined {
  const metaVal = (import.meta.env as Record<string, any>)[key];
  if (metaVal !== undefined) {
    return typeof metaVal === "string" ? metaVal : String(metaVal);
  }
  return process.env[key];
}

export function isAIEnabled(): boolean {
  return env("AI_FEATURES_ENABLED") === "true" && !!env("GEMINI_API_KEY");
}

function getModel(): string {
  return env("AI_MODEL") || GEMINI_3_FLASH_LITE_MODEL;
}

function getFallbackModel(): string {
  return env("AI_FALLBACK_MODEL") || GEMINI_3_FLASH_LITE_MODEL;
}

function getThinkingLevel(): string {
  return env("AI_THINKING_LEVEL") || "minimal";
}

function getMaxTokens(): number {
  const raw = env("AI_MAX_OUTPUT_TOKENS");
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 4096;
}

function getTimeoutMs(): number {
  const raw = env("AI_TIMEOUT_MS");
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 30000) : 15000;
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
  const fallbackModel = getFallbackModel();
  const maxTokens = options.maxOutputTokens ?? getMaxTokens();
  const timeoutMs = options.timeoutMs ?? getTimeoutMs();
  const startedAt = Date.now();

  const config: Record<string, unknown> = {
    maxOutputTokens: maxTokens,
    thinkingConfig: {
      thinkingLevel: getThinkingLevel(),
    },
  };

  if (options.responseMimeType) {
    config.responseMimeType = options.responseMimeType;
  }

  if (options.responseSchema) {
    config.responseSchema = options.responseSchema;
  }

  const ai = new GoogleGenAI({ apiKey }) as unknown as GeminiClient;
  const models = fallbackModel === model ? [model] : [model, fallbackModel];

  for (const candidate of models) {
    const primary = await safeRequestContent(
      ai,
      { model: candidate, contents: prompt, config },
      timeoutMs
    );
    if (primary) return primary;
  }

  if (!options.responseSchema) return null;

  const elapsedMs = Date.now() - startedAt;
  const remainingMs = timeoutMs - elapsedMs;
  if (remainingMs < 1000) return null;

  const relaxedConfig = {
    maxOutputTokens: maxTokens,
    thinkingConfig: {
      thinkingLevel: getThinkingLevel(),
    },
  };

  for (const candidate of models) {
    const relaxed = await safeRequestContent(
      ai,
      { model: candidate, contents: prompt, config: relaxedConfig },
      remainingMs
    );
    if (relaxed) return relaxed;
  }

  return null;
}

async function safeRequestContent(
  client: GeminiClient,
  params: Record<string, unknown>,
  timeoutMs: number
): Promise<string | null> {
  try {
    return await requestContent(client, params, timeoutMs);
  } catch (error) {
    if (isTimeoutError(error)) return null;
    return null;
  }
}
