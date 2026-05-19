/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    convexClient?: any;
    user?: {
      _id: string;
      name: string;
      email: string;
      role: string;
    };
    societySlug?: string;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    GEMINI_API_KEY?: string;
    AI_PROVIDER?: string;
    AI_MODEL?: string;
    AI_FALLBACK_MODEL?: string;
    AI_THINKING_LEVEL?: string;
    AI_FEATURES_ENABLED?: string;
    AI_MAX_OUTPUT_TOKENS?: string;
    AI_TIMEOUT_MS?: string;
    AI_ASSISTANT_MAX_INPUT_CHARS?: string;
    AI_ASSISTANT_MAX_MESSAGES?: string;
  }
}
