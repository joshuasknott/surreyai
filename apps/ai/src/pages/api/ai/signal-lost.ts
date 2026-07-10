import type { APIRoute } from "astro";
import {
  generateContent,
  isAIEnabled,
  type GeminiResponseSchema,
} from "../../../lib/server/ai/gemini";

type JsonObject = Record<string, unknown>;

type CaseDefinition = {
  title: string;
  briefing: string;
  evidence: Record<string, string>;
  fallbackHints: [string, string, string];
};

type RateBucket = {
  count: number;
  startedAt: number;
  lastSeenAt: number;
};

const CASES: Record<string, CaseDefinition> = {
  "locked-lab": {
    title: "The Locked Lab",
    briefing:
      "A safety system sealed the showcase lab after reporting smoke, but the heat alarm stayed quiet.",
    evidence: {
      "air-sensor": "Air particles spiked at 22:41 while temperature stayed normal.",
      "automation-log": "The lockdown rule reacted to particles without checking the heat sensor.",
      "event-plan": "A stage-fog rehearsal started at 22:40 in the adjoining demo space.",
      "vent-camera": "The room looked clear again ninety seconds after the spike.",
    },
    fallbackHints: [
      "The heat channel never agreed with the smoke alert. Find a clue that explains the particles.",
      "Compare the alert time with tonight's event schedule. The clocks are unusually close.",
      "A short particle spike and normal heat suggest an effect, not a continuing fire.",
    ],
  },
  "phantom-shuttle": {
    title: "The Phantom Shuttle",
    briefing:
      "The autonomous campus shuttle stopped beside the showcase hall even though its physical route was clear.",
    evidence: {
      "route-camera": "The route camera marked two bright diagonal strips as lane boundaries.",
      lidar: "The depth sensor reported an open path with no person or object ahead.",
      "print-order": "A reflective silver launch banner was fitted beside the route at 22:55.",
      "brake-log": "The shuttle chose a safe stop when its camera and depth sensor disagreed.",
    },
    fallbackHints: [
      "One sensor saw a problem and another saw open space. Inspect what each sensor actually noticed.",
      "Look for something new beside the route that reflects more light than ordinary scenery.",
      "The safe stop was sensible; the camera's interpretation of the scene was the weak link.",
    ],
  },
  "missing-message": {
    title: "The Missing Message",
    briefing:
      "Lobby screens replaced the live launch countdown with an old cancellation card for twelve seconds.",
    evidence: {
      "upload-queue": "Two different clips arrived with the same filename: launch_final.mp4.",
      "rehearsal-plan": "Yesterday's failover rehearsal used a temporary cancellation card.",
      fingerprint: "The lobby clip exactly matched the rehearsal file; no new media was generated.",
      "publish-rule": "When the live feed dipped, the newest matching filename was promoted automatically.",
    },
    fallbackHints: [
      "The screen showed an old asset, not a newly written message. Trace how files are selected.",
      "Two uploads share a name. Check what the fallback rule does when the live feed disappears.",
      "The twelve-second message came from a rehearsal asset that an automatic rule trusted too readily.",
    ],
  },
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const MAX_BODY_BYTES = 4_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const RATE_BUCKET_LIMIT = 800;
const rateBuckets = new Map<string, RateBucket>();

const SchemaType = {
  OBJECT: "OBJECT",
  STRING: "STRING",
} as const;

const AURA_SCHEMA: GeminiResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    message: { type: SchemaType.STRING },
  },
  required: ["message"],
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const contentLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "That AURA request is too large." }, 413);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "AURA requests must use JSON." }, 415);
  }

  const rate = consumeRateLimit(readClientKey(request, clientAddress));
  if (!rate.allowed) {
    return jsonResponse(
      {
        error: "AURA's channel is busy. Continue investigating or try again shortly.",
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      429,
      { "Retry-After": String(rate.retryAfterSeconds) }
    );
  }

  const parsed = await parseRequest(request);
  if ("response" in parsed) return parsed.response;

  const { caseId, caseDefinition, evidenceIds } = parsed;
  const liveMessage = await askAura(caseDefinition, evidenceIds);

  if (liveMessage) {
    return jsonResponse({ source: "ai", message: liveMessage });
  }

  return jsonResponse({
    source: "fallback",
    message: fallbackHint(caseDefinition, evidenceIds.length),
    modeNote: isAIEnabled()
      ? "Live AURA did not answer, so this came from the case's built-in notes."
      : "Live AURA is offline, so this came from the case's built-in notes.",
    caseId,
  });
};

async function parseRequest(
  request: Request
): Promise<
  | { caseId: string; caseDefinition: CaseDefinition; evidenceIds: string[] }
  | { response: Response }
> {
  let body: JsonObject;

  try {
    const value = await request.json();
    if (!isRecord(value)) {
      return { response: jsonResponse({ error: "The request must be an object." }, 400) };
    }
    body = value;
  } catch {
    return { response: jsonResponse({ error: "The AURA request was not valid JSON." }, 400) };
  }

  const caseId = cleanId(body.caseId, 40);
  const caseDefinition = CASES[caseId];
  if (!caseDefinition) {
    return { response: jsonResponse({ error: "Unknown Signal Lost case." }, 400) };
  }

  if (!Array.isArray(body.evidence) || body.evidence.length > 4) {
    return { response: jsonResponse({ error: "Evidence must be a short list." }, 400) };
  }

  const evidenceIds: string[] = [];
  for (const value of body.evidence) {
    const id = cleanId(value, 40);
    if (!id || !caseDefinition.evidence[id]) {
      return { response: jsonResponse({ error: "Unknown evidence item." }, 400) };
    }
    evidenceIds.push(id);
  }

  if (new Set(evidenceIds).size !== evidenceIds.length) {
    return { response: jsonResponse({ error: "Evidence items must be unique." }, 400) };
  }

  return { caseId, caseDefinition, evidenceIds };
}

async function askAura(
  caseDefinition: CaseDefinition,
  evidenceIds: string[]
): Promise<string | null> {
  if (!isAIEnabled()) return null;

  const collected = evidenceIds.length
    ? evidenceIds.map((id) => caseDefinition.evidence[id])
    : ["No evidence has been inspected yet."];
  const unseen = Object.entries(caseDefinition.evidence)
    .filter(([id]) => !evidenceIds.includes(id))
    .map(([, description]) => description);

  const prompt = `You are AURA, a calm control-room AI in a short university mystery game.
Case: ${JSON.stringify(caseDefinition.title)}
Briefing: ${JSON.stringify(caseDefinition.briefing)}
Evidence the player inspected: ${JSON.stringify(collected)}
Evidence not yet inspected: ${JSON.stringify(unseen)}

Return exactly one JSON object with a "message" string.
Give one context-aware investigative nudge in 32 words or fewer. Speak in clear, atmospheric, nontechnical language. Connect clues the player has found or point toward one useful missing clue. Never state the final deduction and never invent evidence.`;

  const text = await generateContent(prompt, {
    responseMimeType: "application/json",
    responseSchema: AURA_SCHEMA,
    maxOutputTokens: 90,
    timeoutMs: 10_000,
  });

  const parsed = text ? extractJson(text) : null;
  if (!isRecord(parsed)) return null;
  return cleanMessage(parsed.message, 220) || null;
}

function fallbackHint(caseDefinition: CaseDefinition, evidenceCount: number): string {
  const index = evidenceCount <= 0 ? 0 : evidenceCount === 1 ? 1 : 2;
  return caseDefinition.fallbackHints[index];
}

function extractJson(text: string): unknown | null {
  const candidates = [text.trim()];
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced) candidates.push(fenced[1].trim());

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next bounded candidate.
    }
  }
  return null;
}

function consumeRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  tidyRateBuckets(now);

  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, startedAt: now, lastSeenAt: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.lastSeenAt = now;
  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket.startedAt)) / 1000)
      ),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function tidyRateBuckets(now: number): void {
  if (rateBuckets.size < RATE_BUCKET_LIMIT) return;
  const staleBefore = now - RATE_LIMIT_WINDOW_MS * 2;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.lastSeenAt < staleBefore || rateBuckets.size > RATE_BUCKET_LIMIT) {
      rateBuckets.delete(key);
    }
  }
}

function readClientKey(request: Request, clientAddress?: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const connecting = request.headers.get("cf-connecting-ip")?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return (connecting || real || forwarded || clientAddress || "unknown").slice(0, 120);
}

function cleanId(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const id = value.trim().toLowerCase();
  if (id.length > maxLength || !/^[a-z0-9-]+$/.test(id)) return "";
  return id;
}

function cleanMessage(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const message = value.replace(/\s+/g, " ").trim();
  return message.length <= maxLength ? message : message.slice(0, maxLength).trimEnd();
}

function jsonResponse(
  data: JsonObject,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
