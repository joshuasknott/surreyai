import { GoogleGenAI } from "@google/genai";
import { createConvexClient, getSocietyById } from "@surreysocieties/admin";

export type SocietyKey = "ai" | "business" | "neurotech";
export type AssistantRole = "user" | "assistant";

export type AssistantMessage = {
  role: AssistantRole;
  content: string;
};

type PublicAssistantContext = {
  society: {
    name: string;
    shortName: string;
    slug: string;
    domain: string;
    establishedYear: number | null;
    contactEmail: string | null;
    membershipUrl: string | null;
    studentsUnionUrl: string | null;
    socials: {
      instagram: string | null;
      linkedin: string | null;
      email: string | null;
    };
  };
  events: Array<{
    title: string;
    description: string | null;
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    category: string | null;
    registrationUrl: string | null;
    isFeatured: boolean;
  }>;
  committee: Array<{
    name: string;
    role: string;
    bio: string | null;
  }>;
};

type GeminiGenerateResult = {
  text?: unknown;
};

type GeminiClient = {
  models: {
    generateContent(params: Record<string, unknown>): Promise<GeminiGenerateResult>;
  };
};

type JsonObject = Record<string, unknown>;
type AssistantResponseSource = "ai" | "fallback";

const JSON_HEADERS = { "Content-Type": "application/json" };
const DEFAULT_MAX_MESSAGES = 12;
const DEFAULT_MAX_INPUT_CHARS = 1200;
const MAX_TOTAL_USER_CHARS = 6000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 24;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const STATIC_CONTEXT: Record<SocietyKey, {
  shortDescription: string;
  tone: string;
  allowedTopics: string[];
  primaryCategories: string[];
  fallbackLinks: Array<{ label: string; href: string }>;
}> = {
  ai: {
    shortDescription:
      "Surrey Artificial Intelligence Society is a student-led community for learning, building, and discussing artificial intelligence at the University of Surrey.",
    tone: "clear, practical, beginner-friendly, responsible, and curious",
    allowedTopics: ["AI learning", "student projects", "events", "committee", "responsible AI", "getting involved"],
    primaryCategories: ["Workshops", "Projects", "Build nights", "Ethics", "Careers"],
    fallbackLinks: [
      { label: "Join", href: "/join" },
      { label: "Events", href: "/events" },
      { label: "Committee", href: "/committee" },
    ],
  },
  business: {
    shortDescription:
      "Surrey Business Society helps University of Surrey students build career direction, enterprise thinking, useful networks, and practical workplace skills.",
    tone: "professional, concise, supportive, commercially aware, and accessible",
    allowedTopics: ["careers", "enterprise", "startups", "networking", "events", "committee", "getting involved"],
    primaryCategories: ["Careers", "Enterprise", "Networking", "Skills", "Commercial awareness"],
    fallbackLinks: [
      { label: "Join", href: "/join" },
      { label: "Events", href: "/events" },
      { label: "Committee", href: "/committee" },
    ],
  },
  neurotech: {
    shortDescription:
      "Surrey Neurotech Society helps students explore neuroscience, brain-computer interfaces, signal processing, AI, ethics, and human-centred innovation.",
    tone: "friendly, accessible, thoughtful, technically grounded, and ethics-aware",
    allowedTopics: ["neurotechnology", "BCIs", "neuroscience basics", "signal processing", "ethics", "events", "committee"],
    primaryCategories: ["Neuroscience", "Brain-computer interfaces", "AI", "Ethics", "Projects"],
    fallbackLinks: [
      { label: "Join", href: "/join" },
      { label: "Events", href: "/events" },
      { label: "Committee", href: "/committee" },
    ],
  },
};

function env(key: string): string | undefined {
  return process.env[key];
}

function isAIEnabled(): boolean {
  return env("AI_FEATURES_ENABLED") !== "false" && Boolean(env("GEMINI_API_KEY"));
}

function getModel(): string {
  return env("AI_MODEL") || "gemini-3.1-flash-lite-preview";
}

function getFallbackModel(): string {
  return env("AI_FALLBACK_MODEL") || "gemini-3-flash-preview";
}

function getThinkingLevel(): string {
  return env("AI_THINKING_LEVEL") || "minimal";
}

function getPositiveIntEnv(key: string, fallback: number, max?: number): number {
  const raw = env(key);
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const value = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return max ? Math.min(value, max) : value;
}

function jsonResponse(data: JsonObject, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

export async function handleAssistantChatRequest(
  request: Request,
  societyKey: SocietyKey
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const rateLimitKey = readRateLimitKey(request, societyKey);
  if (!allowRequest(rateLimitKey)) {
    return jsonResponse(
      {
        source: "fallback",
        message: "I am receiving a lot of questions right now. Please wait a moment and try again.",
      },
      429
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "Request must use application/json" }, 415);
  }

  const parsed = await parseRequestBody(request);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, parsed.status);
  }

  const messages = normalizeMessages(parsed.body.messages);
  if (messages.length === 0) {
    return jsonResponse({ error: "At least one user message is required" }, 400);
  }

  const staticContext = STATIC_CONTEXT[societyKey];
  const publicContext = await getPublicContext(societyKey);

  if (!isAIEnabled()) {
    return jsonResponse({
      source: "fallback",
      message: buildFlexibleFallback(societyKey, messages, publicContext, staticContext),
    });
  }

  const prompt = buildPrompt(societyKey, staticContext, publicContext, messages);
  const aiText = await generateGeminiContent(prompt);

  if (!aiText) {
    return jsonResponse({
      source: "ai",
      message: buildFlexibleFallback(societyKey, messages, publicContext, staticContext),
    });
  }

  return jsonResponse({
    source: "ai",
    message: cleanGeneratedText(aiText, 2000),
  });
}

async function parseRequestBody(
  request: Request
): Promise<
  | { ok: true; body: JsonObject }
  | { ok: false; status: number; error: string }
> {
  try {
    const body = await request.json();
    if (!isRecord(body)) {
      return { ok: false, status: 400, error: "JSON body must be an object" };
    }
    return { ok: true, body };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
}

function normalizeMessages(value: unknown): AssistantMessage[] {
  if (!Array.isArray(value)) return [];

  const maxMessages = getPositiveIntEnv(
    "AI_ASSISTANT_MAX_MESSAGES",
    DEFAULT_MAX_MESSAGES,
    16
  );
  const maxInputChars = getPositiveIntEnv(
    "AI_ASSISTANT_MAX_INPUT_CHARS",
    DEFAULT_MAX_INPUT_CHARS,
    2000
  );

  let totalChars = 0;
  const normalized: AssistantMessage[] = [];

  for (const item of value.slice(-maxMessages)) {
    if (!isRecord(item)) continue;

    const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
    if (!role) continue;

    const content = cleanString(item.content, maxInputChars);
    if (!content) continue;

    totalChars += content.length;
    if (totalChars > MAX_TOTAL_USER_CHARS) break;

    normalized.push({ role, content });
  }

  return normalized.filter((message) => message.role === "user" || message.content.length > 0);
}

async function getPublicContext(societyKey: SocietyKey): Promise<PublicAssistantContext | null> {
  try {
    const client = createConvexClient();
    const result = await client.query("assistant:getPublicContext", {
      societySlug: societyKey,
    });
    return isPublicAssistantContext(result) ? result : null;
  } catch {
    return null;
  }
}

function isPublicAssistantContext(value: unknown): value is PublicAssistantContext {
  return isRecord(value) && isRecord(value.society) && Array.isArray(value.events) && Array.isArray(value.committee);
}

async function generateGeminiContent(prompt: string): Promise<string | null> {
  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) return null;

  const model = getModel();
  const fallbackModel = getFallbackModel();
  const maxOutputTokens = getPositiveIntEnv("AI_MAX_OUTPUT_TOKENS", 1024, 2048);
  const timeoutMs = getPositiveIntEnv("AI_TIMEOUT_MS", 8000, 15_000);
  const ai = new GoogleGenAI({ apiKey }) as unknown as GeminiClient;

  const primary = await requestGeminiContent(ai, {
    model,
    prompt,
    maxOutputTokens,
    timeoutMs,
  });
  if (primary || fallbackModel === model) return primary;

  return await requestGeminiContent(ai, {
    model: fallbackModel,
    prompt,
    maxOutputTokens,
    timeoutMs,
  });
}

async function requestGeminiContent(
  ai: GeminiClient,
  input: {
    model: string;
    prompt: string;
    maxOutputTokens: number;
    timeoutMs: number;
  }
): Promise<string | null> {
  try {
    const result = await withTimeout(
      () =>
        ai.models.generateContent({
          model: input.model,
          contents: input.prompt,
          config: {
            maxOutputTokens: input.maxOutputTokens,
            thinkingConfig: {
              thinkingLevel: getThinkingLevel(),
            },
          },
        }),
      input.timeoutMs
    );

    return typeof result.text === "string" && result.text.trim()
      ? result.text.trim()
      : null;
  } catch {
    return null;
  }
}

async function withTimeout<T>(task: () => Promise<T>, timeoutMs: number): Promise<T> {
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

function buildPrompt(
  societyKey: SocietyKey,
  staticContext: (typeof STATIC_CONTEXT)[SocietyKey],
  publicContext: PublicAssistantContext | null,
  messages: AssistantMessage[]
): string {
  const society = publicContext?.society;
  const societyConfig = getSocietyById(societyKey);
  const societyName = society?.name || societyConfig?.name || societyKey;
  const contextPayload = JSON.stringify(
    {
      society: {
        name: societyName,
        shortName: society?.shortName || societyConfig?.shortName || societyName,
        description: staticContext.shortDescription,
        domain: society?.domain || societyConfig?.domain || null,
        establishedYear: society?.establishedYear ?? societyConfig?.establishedYear ?? null,
        contactEmail: society?.contactEmail || societyConfig?.contactEmail || null,
        membershipUrl: society?.membershipUrl || societyConfig?.membershipUrl || null,
        studentsUnionUrl: society?.studentsUnionUrl || societyConfig?.studentsUnionUrl || null,
        socials: society?.socials || societyConfig?.socials || null,
      },
      primaryCategories: staticContext.primaryCategories,
      allowedTopics: staticContext.allowedTopics,
      fallbackLinks: staticContext.fallbackLinks,
      publishedEvents: publicContext?.events ?? [],
      activeCommittee: publicContext?.committee ?? [],
    },
    null,
    2
  );

  const conversation = messages
    .map((message) => `${message.role.toUpperCase()}: ${JSON.stringify(message.content)}`)
    .join("\n");

  return `You are the friendly, knowledgeable website assistant for ${societyName}, a student society at the University of Surrey.

Your tone is ${staticContext.tone}.

Guidelines:
- You represent ${societyName} on their public website. Be warm, engaging, and helpful.
- Use the provided society context to give accurate answers about the society, its events, committee, and how to get involved.
- Feel free to discuss topics broadly related to the society's focus areas, even if the exact answer is not in the context. Be helpful and conversational.
- If asked about specific events, committee members, dates, or links, only reference what appears in the publishedEvents and activeCommittee data below. Do not invent specific events or people.
- If you genuinely do not know something, say so honestly and suggest where the student can find more info (relevant page link, contact email, or social media).
- Do not reveal any private admin data, user data, secrets, or backend implementation details.
- Keep answers concise and useful, but do not be overly terse. A natural, conversational length is ideal.
- Be encouraging. Help students feel welcome and excited about the society.

Public context:
${contextPayload}

Conversation:
${conversation}

Respond as the ${societyName} assistant. Return only your reply as plain text.`;
}

function buildFlexibleFallback(
  societyKey: SocietyKey,
  messages: AssistantMessage[],
  publicContext: PublicAssistantContext | null,
  staticContext: (typeof STATIC_CONTEXT)[SocietyKey]
): string {
  const latest = messages.filter((message) => message.role === "user").at(-1)?.content.toLowerCase() || "";
  const society = publicContext?.society || getSocietyById(societyKey);
  const societyName = society?.name || societyKey;
  const events = publicContext?.events ?? [];
  const committee = publicContext?.committee ?? [];
  const links = staticContext.fallbackLinks.map((l) => l.label).join(", ");

  if (latest.includes("event")) {
    if (events.length === 0) {
      return `There are no published events for ${societyName} right now, but new ones are added regularly. Keep an eye on the Events page or follow us on social media for updates!`;
    }
    const summary = events
      .slice(0, 4)
      .map((event) => {
        const when = event.date ? ` on ${event.date}` : "";
        const where = event.location ? ` at ${event.location}` : "";
        return `${event.title}${when}${where}`;
      })
      .join("; ");
    return `Here are some upcoming events: ${summary}. Check the Events page for the latest details and registration links!`;
  }

  if (latest.includes("committee") || latest.includes("who runs") || latest.includes("team") || latest.includes("who")) {
    if (committee.length === 0) {
      return `Committee details for ${societyName} are on the Committee page. Feel free to reach out via our socials if you have questions!`;
    }
    const summary = committee
      .slice(0, 6)
      .map((member) => `${member.name} (${member.role})`)
      .join(", ");
    return `The current committee includes ${summary}. Check the Committee page for the full list and bios!`;
  }

  if (latest.includes("join") || latest.includes("involved") || latest.includes("member") || latest.includes("sign up")) {
    const membershipUrl = society?.membershipUrl;
    if (membershipUrl) {
      return `Great to hear you want to join ${societyName}! You can sign up via our Join page or directly at ${membershipUrl}. We'd love to have you!`;
    }
    return `We'd love to have you join ${societyName}! Head to the Join page to get started, and feel free to come along to any of our events.`;
  }

  if (latest.includes("contact") || latest.includes("email") || latest.includes("reach")) {
    const email = society?.contactEmail || society?.socials?.email;
    if (email) {
      return `You can reach ${societyName} at ${email}. You can also find us on social media or check the website for more contact details.`;
    }
    return `You can reach out to ${societyName} through our social media channels or the contact details on the website.`;
  }

  if (latest.includes("hello") || latest.includes("hi") || latest.includes("hey")) {
    return `Hey there! I'm the ${societyName} assistant. ${staticContext.shortDescription} How can I help you today? You can ask about events, the committee, how to join, or anything else about the society!`;
  }

  if (latest.includes("about") || latest.includes("what is") || latest.includes("what do")) {
    return `${societyName}: ${staticContext.shortDescription} We cover areas like ${staticContext.primaryCategories.slice(0, 4).join(", ")}. Check out the ${links} pages to learn more!`;
  }

  return `I'm the ${societyName} assistant! ${staticContext.shortDescription} Feel free to ask about our events, committee, how to join, or anything related to ${staticContext.primaryCategories.slice(0, 3).join(", ")}.`;
}

function readRateLimitKey(request: Request, societyKey: SocietyKey): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return `${societyKey}:${forwarded || realIp || "local"}`;
}

function allowRequest(key: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    cleanupRateLimitBuckets(now);
    return true;
  }

  if (bucket.count >= RATE_LIMIT_REQUESTS) return false;
  bucket.count += 1;
  return true;
}

function cleanupRateLimitBuckets(now: number): void {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

function cleanGeneratedText(value: string, maxLength: number): string {
  return cleanString(value.replace(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)```/g, "$1"), maxLength);
}

function cleanString(value: unknown, maxLength: number): string {
  const text =
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
