import { GoogleGenAI } from "@google/genai";
import { createConvexClient, getSocietyById } from "@surreysocieties/admin";
import { makeFunctionReference } from "convex/server";

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

const getPublicContextRef = makeFunctionReference<
  "query",
  { societySlug: SocietyKey },
  unknown
>("assistant:getPublicContext");

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
type SocietyLinkFacts = PublicAssistantContext["society"];

const JSON_HEADERS = { "Content-Type": "application/json" };
const DEFAULT_MAX_MESSAGES = 12;
const DEFAULT_MAX_INPUT_CHARS = 1200;
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const MAX_TOTAL_USER_CHARS = 6000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 24;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const GUARDED_TOPIC_TERMS = {
  event: ["event", "workshop", "session", "meetup", "talks", "calendar", "upcoming"],
  committee: ["committee", "team", "president", "treasurer", "secretary", "who runs", "who leads"],
  speaker: ["speaker", "guest", "panelist", "panellist", "presenter", "keynote"],
  sponsorPartner: ["sponsor", "sponsorship", "partner", "partnership", "collaborator"],
  access: ["equipment", "lab", "laboratory", "research access", "dataset", "hardware", "eeg", "bci"],
  outcome: ["outcome", "guarantee", "certificate", "certification", "internship", "placement", "job", "funding"],
  socials: ["instagram", "linkedin", "social media", "socials", "contact", "email", "reach"],
  membership: ["join", "member", "membership", "sign up", "students' union", "student union", "surrey union", "ussu"],
};

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
  return env("AI_MODEL") || DEFAULT_GEMINI_MODEL;
}

function getFallbackModel(): string {
  return env("AI_FALLBACK_MODEL") || DEFAULT_GEMINI_MODEL;
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
  const verifiedContext = buildVerifiedContext(societyKey, publicContext);
  const guardedFallback = buildGuardedFallback(societyKey, messages, verifiedContext, staticContext);

  if (guardedFallback) {
    return jsonResponse({
      source: "fallback",
      message: guardedFallback,
    });
  }

  if (!isAIEnabled()) {
    return jsonResponse({
      source: "fallback",
      message: buildFlexibleFallback(societyKey, messages, verifiedContext, staticContext),
    });
  }

  const prompt = buildPrompt(societyKey, staticContext, verifiedContext, messages);
  const aiText = await generateGeminiContent(prompt);

  if (!aiText) {
    return jsonResponse({
      source: "fallback",
      message: buildFlexibleFallback(societyKey, messages, verifiedContext, staticContext),
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
    const result = await client.query(getPublicContextRef, {
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

function buildVerifiedContext(
  societyKey: SocietyKey,
  publicContext: PublicAssistantContext | null
): PublicAssistantContext {
  const societyConfig = getSocietyById(societyKey);
  const publicSociety = publicContext?.society;
  const configSocials = societyConfig?.socials;

  const society: SocietyLinkFacts = {
    name: societyConfig?.name || publicSociety?.name || societyKey,
    shortName: societyConfig?.shortName || publicSociety?.shortName || societyKey,
    slug: societyConfig?.slug || publicSociety?.slug || societyKey,
    domain: societyConfig?.domain || publicSociety?.domain || "",
    establishedYear: societyConfig?.establishedYear ?? publicSociety?.establishedYear ?? null,
    contactEmail: societyConfig?.contactEmail || publicSociety?.contactEmail || null,
    membershipUrl: societyConfig?.membershipUrl || publicSociety?.membershipUrl || null,
    studentsUnionUrl: societyConfig?.studentsUnionUrl || publicSociety?.studentsUnionUrl || null,
    socials: {
      instagram: configSocials?.instagram || publicSociety?.socials?.instagram || null,
      linkedin: societyKey === "ai" ? null : configSocials?.linkedin || publicSociety?.socials?.linkedin || null,
      email: configSocials?.email || publicSociety?.socials?.email || societyConfig?.contactEmail || null,
    },
  };

  return {
    society,
    events: publicContext?.events ?? [],
    committee: publicContext?.committee ?? [],
  };
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
  publicContext: PublicAssistantContext,
  messages: AssistantMessage[]
): string {
  const society = publicContext.society;
  const societyName = society.name;
  const contextPayload = JSON.stringify(
    {
      society: {
        name: societyName,
        shortName: society.shortName,
        description: staticContext.shortDescription,
        domain: society.domain || null,
        establishedYear: society.establishedYear,
        contactEmail: society.contactEmail,
        membershipUrl: society.membershipUrl,
        studentsUnionUrl: society.studentsUnionUrl,
        socials: society.socials,
      },
      primaryCategories: staticContext.primaryCategories,
      allowedTopics: staticContext.allowedTopics,
      fallbackLinks: staticContext.fallbackLinks,
      publishedEvents: publicContext.events,
      activeCommittee: publicContext.committee,
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
- Keep answers extremely concise, direct, and conversational (1-3 sentences). Avoid paragraphs or lists unless explicitly requested.
- Get straight to the point. Do not repeat the user's question or repeat information you have already mentioned in the conversation.
- Treat the Public context JSON as the complete verified source of truth. Do not use outside knowledge, assumptions, or likely society activities.
- Only reference events, committee members, sponsors, partners, speakers, equipment access, lab access, research access, outcomes, or links when they explicitly appear in Public context. Do not invent or infer any of them.
- The categories and description are themes only; they are not proof that a programme, project, lab, research opportunity, equipment access, sponsor, partner, speaker, certificate, internship, funding, or outcome exists.
- If the verified context does not answer the question, say there are no verified public details available and suggest one relevant verified contact or page link.
- For Surrey AI Society, LinkedIn is unavailable unless Public context has a non-null LinkedIn URL. Never create or guess one.
- For Business Society and Neurotech Society, do not imply public AI features beyond this website assistant unless Public context explicitly says so.
- Never reveal private admin data, secrets, or implementation details.

Public context:
${contextPayload}

Conversation:
${conversation}

Respond as the ${societyName} assistant. Return only your reply as plain text.`;
}

function buildGuardedFallback(
  societyKey: SocietyKey,
  messages: AssistantMessage[],
  publicContext: PublicAssistantContext,
  staticContext: (typeof STATIC_CONTEXT)[SocietyKey]
): string | null {
  const latest = getLatestUserText(messages);
  if (!latest) return null;

  if (hasAnyTerm(latest, GUARDED_TOPIC_TERMS.socials)) {
    return buildSocialFallback(societyKey, publicContext.society);
  }

  if (hasAnyTerm(latest, GUARDED_TOPIC_TERMS.speaker)) {
    return buildNoVerifiedDetailsFallback(publicContext.society, "speaker details", "Events");
  }

  if (hasAnyTerm(latest, GUARDED_TOPIC_TERMS.sponsorPartner)) {
    return buildNoVerifiedDetailsFallback(publicContext.society, "sponsor or partner details", "contact");
  }

  if (hasAnyTerm(latest, GUARDED_TOPIC_TERMS.access)) {
    return buildNoVerifiedDetailsFallback(publicContext.society, "equipment, lab, or research access", "contact");
  }

  if (hasAnyTerm(latest, GUARDED_TOPIC_TERMS.outcome)) {
    return buildNoVerifiedDetailsFallback(publicContext.society, "guaranteed outcomes", "contact");
  }

  if (hasAnyTerm(latest, GUARDED_TOPIC_TERMS.membership)) {
    return buildMembershipFallback(publicContext.society);
  }

  if (hasAnyTerm(latest, GUARDED_TOPIC_TERMS.event)) {
    return buildEventsFallback(publicContext);
  }

  if (hasAnyTerm(latest, GUARDED_TOPIC_TERMS.committee)) {
    return buildCommitteeFallback(publicContext);
  }

  if (latest.includes("about") || latest.includes("what is") || latest.includes("what do")) {
    return `${publicContext.society.name}: ${staticContext.shortDescription} For verified details, use the Join, Events, Committee, or Students' Union links.`;
  }

  return null;
}

function buildEventsFallback(publicContext: PublicAssistantContext): string {
  const events = publicContext.events;
  if (events.length === 0) {
    return `There are no published events for ${publicContext.society.name} right now. Check the Events page or ${contactText(publicContext.society)} for verified updates.`;
  }

  const summary = events
    .slice(0, 4)
    .map((event) => {
      const when = event.date ? ` on ${event.date}` : "";
      const where = event.location ? ` at ${event.location}` : "";
      return `${event.title}${when}${where}`;
    })
    .join("; ");
  return `Published events I can verify: ${summary}. Check the Events page for the latest details and registration links.`;
}

function buildCommitteeFallback(publicContext: PublicAssistantContext): string {
  const committee = publicContext.committee;
  if (committee.length === 0) {
    return `I do not have verified public committee details for ${publicContext.society.name} right now. Check the Committee page or ${contactText(publicContext.society)}.`;
  }

  const summary = committee
    .slice(0, 6)
    .map((member) => `${member.name} (${member.role})`)
    .join(", ");
  return `Verified committee members include ${summary}. Check the Committee page for the full public list.`;
}

function buildMembershipFallback(society: SocietyLinkFacts): string {
  const parts = [
    society.membershipUrl ? `join at ${society.membershipUrl}` : "use the Join page",
    society.studentsUnionUrl ? `Students' Union page: ${society.studentsUnionUrl}` : null,
  ].filter(Boolean);
  return `Membership for ${society.name} is handled through Surrey Students' Union. You can ${parts.join("; ")}.`;
}

function buildSocialFallback(societyKey: SocietyKey, society: SocietyLinkFacts): string {
  const links = [
    society.contactEmail ? `email: ${society.contactEmail}` : null,
    society.socials.instagram ? `Instagram: ${society.socials.instagram}` : null,
    society.socials.linkedin ? `LinkedIn: ${society.socials.linkedin}` : null,
    society.studentsUnionUrl ? `Students' Union: ${society.studentsUnionUrl}` : null,
  ].filter(Boolean);
  const linkedinNote = societyKey === "ai" && !society.socials.linkedin ? " LinkedIn is not currently listed for Surrey AI Society." : "";
  return `${society.name} verified contacts: ${links.join("; ") || contactText(society)}.${linkedinNote}`;
}

function buildNoVerifiedDetailsFallback(
  society: SocietyLinkFacts,
  topic: string,
  destination: "contact" | "Events"
): string {
  const nextStep = destination === "Events" ? "check the Events page" : contactText(society);
  return `I do not have verified public ${topic} for ${society.name} right now. Please ${nextStep} for confirmation.`;
}

function contactText(society: SocietyLinkFacts): string {
  if (society.contactEmail) return `contact ${society.contactEmail}`;
  if (society.socials.email) return `contact ${society.socials.email}`;
  if (society.studentsUnionUrl) return `check ${society.studentsUnionUrl}`;
  return "check the website";
}

function getLatestUserText(messages: AssistantMessage[]): string {
  return messages.filter((message) => message.role === "user").at(-1)?.content.toLowerCase() || "";
}

function hasAnyTerm(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function buildFlexibleFallback(
  societyKey: SocietyKey,
  messages: AssistantMessage[],
  publicContext: PublicAssistantContext,
  staticContext: (typeof STATIC_CONTEXT)[SocietyKey]
): string {
  const latest = getLatestUserText(messages);
  const society = publicContext.society;
  const societyName = society.name;
  const events = publicContext.events;
  const committee = publicContext.committee;
  const links = staticContext.fallbackLinks.map((l) => l.label).join(", ");

  if (latest.includes("event")) {
    if (events.length === 0) {
      return buildEventsFallback(publicContext);
    }
    const summary = events
      .slice(0, 4)
      .map((event) => {
        const when = event.date ? ` on ${event.date}` : "";
        const where = event.location ? ` at ${event.location}` : "";
        return `${event.title}${when}${where}`;
      })
      .join("; ");
    return `Published events I can verify: ${summary}. Check the Events page for the latest details and registration links.`;
  }

  if (latest.includes("committee") || latest.includes("who runs") || latest.includes("team") || latest.includes("who")) {
    if (committee.length === 0) {
      return buildCommitteeFallback(publicContext);
    }
    const summary = committee
      .slice(0, 6)
      .map((member) => `${member.name} (${member.role})`)
      .join(", ");
    return `Verified committee members include ${summary}. Check the Committee page for the full public list.`;
  }

  if (latest.includes("join") || latest.includes("involved") || latest.includes("member") || latest.includes("sign up")) {
    return buildMembershipFallback(society);
  }

  if (latest.includes("contact") || latest.includes("email") || latest.includes("reach")) {
    return buildSocialFallback(societyKey, society);
  }

  if (latest.includes("hello") || latest.includes("hi") || latest.includes("hey")) {
    return `Hey there! I'm the ${societyName} assistant. I can answer from verified public website context about events, committee, membership, and contact links.`;
  }

  if (latest.includes("about") || latest.includes("what is") || latest.includes("what do")) {
    return `${societyName}: ${staticContext.shortDescription} I can only confirm details from verified public pages like ${links} and Students' Union links.`;
  }

  return `I'm the ${societyName} assistant. Ask me about verified public events, committee, membership, or contact links.`;
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
